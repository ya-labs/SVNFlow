import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateCommitPreConditions } from '../commit-validator';
import { executeCommit } from '../commit-executor';
import { generateGitPatch } from '../git-patch';
import { exportSvnflowPackage } from '../package-exporter';
import { readValidatedPackagePatch } from '../package-importer';
import { buildApplyPlan, executeApply } from '../svn-apply-flow';

function commandAvailable(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const toolsAvailable = commandAvailable('git', ['--version'])
  && commandAvailable('svn', ['--version', '--quiet'])
  && commandAvailable('svnadmin', ['--version', '--quiet']);

const describeWithTools = toolsAvailable ? describe : describe.skip;

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function writeProjectFiles(root: string): void {
  writeFileSync(path.join(root, 'app.txt'), 'linha 1\nlinha 2\n');
  writeFileSync(path.join(root, 'antigo.txt'), 'arquivo que sera removido\n');
}

describeWithTools('fluxo ponta a ponta Git -> pacote -> SVN', () => {
  let gitPath: string;
  let svnPath: string;
  let packagesPath: string;

  beforeAll(() => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-e2e-'));
    const repoPath = path.join(root, 'repo');
    gitPath = path.join(root, 'git');
    svnPath = path.join(root, 'svn');
    packagesPath = path.join(root, 'pacotes');

    run('svnadmin', ['create', repoPath], root);
    run('svn', ['checkout', `file://${repoPath}`, svnPath, '--quiet'], root);
    writeProjectFiles(svnPath);
    run('svn', ['add', '--quiet', 'app.txt', 'antigo.txt'], svnPath);
    run('svn', ['commit', '--quiet', '-m', 'Estado inicial.'], svnPath);

    mkdirSync(gitPath);
    run('git', ['init', '--quiet', '--initial-branch=main'], gitPath);
    run('git', ['config', 'user.email', 'pessoa@exemplo.local'], gitPath);
    run('git', ['config', 'user.name', 'Pessoa Teste'], gitPath);
    writeProjectFiles(gitPath);
    run('git', ['add', '.'], gitPath);
    run('git', ['commit', '--quiet', '-m', 'estado inicial'], gitPath);
    run('git', ['checkout', '--quiet', '-b', 'feature/ajuste'], gitPath);
    writeFileSync(path.join(gitPath, 'app.txt'), 'linha 1\nlinha 2 alterada\n');
    mkdirSync(path.join(gitPath, 'modulo'));
    writeFileSync(path.join(gitPath, 'modulo', 'novo.txt'), 'arquivo novo\n');
    run('git', ['rm', '--quiet', 'antigo.txt'], gitPath);
    run('git', ['add', '.'], gitPath);
    run('git', ['commit', '--quiet', '-m', 'ajuste'], gitPath);
  });

  it('exporta, importa, aplica e commita a alteração no SVN', async () => {
    const patch = generateGitPatch({ gitRepositoryPath: gitPath, baseBranch: 'main' });
    expect(patch.ok).toBe(true);

    const exported = await exportSvnflowPackage({
      outputDirectory: packagesPath,
      patchContent: patch.patchContent,
      author: 'Pessoa Teste',
      miniPr: {
        title: 'Ajusta app e reorganiza modulo',
        context: 'Teste ponta a ponta.',
        whatChanged: 'Altera app.txt\nCria modulo/novo.txt\nRemove antigo.txt',
        notes: ''
      },
      preview: {
        environment: { environmentName: 'E2E', gitWorkspacePath: gitPath, svnCheckoutPath: svnPath },
        workspace: {
          branch: 'feature/ajuste',
          baseBranch: 'main',
          totalAffectedFiles: 3,
          files: [
            { path: 'app.txt', status: 'Modificado', description: 'Modificado: app.txt', rawStatus: 'M' },
            { path: 'modulo/novo.txt', status: 'Criado', description: 'Criado: modulo/novo.txt', rawStatus: 'A' },
            { path: 'antigo.txt', status: 'Removido', description: 'Removido: antigo.txt', rawStatus: 'D' }
          ]
        },
        blockers: [],
        alerts: []
      }
    });
    expect(exported.ok).toBe(true);

    const imported = await readValidatedPackagePatch(exported.packagePath!);
    expect(imported.ok).toBe(true);
    expect(imported.result.patchFiles?.sort()).toEqual(['antigo.txt', 'app.txt', 'modulo/novo.txt']);

    const planInput = {
      environmentName: 'E2E',
      svnCheckoutPath: svnPath,
      patchContent: imported.patchContent!,
      source: { kind: 'package' as const, label: 'Pacote E2E', packagePath: exported.packagePath }
    };
    const plan = buildApplyPlan(planInput);
    expect(plan.blockers).toEqual([]);
    expect(plan.canConfirm).toBe(true);

    const notConfirmed = executeApply({ ...planInput, confirmed: false });
    expect(notConfirmed.status).toBe('blocked');
    expect(readFileSync(path.join(svnPath, 'app.txt'), 'utf8')).toBe('linha 1\nlinha 2\n');

    const applied = executeApply({ ...planInput, confirmed: true });
    expect(applied.status).toBe('applied');
    expect(applied.scheduling?.errors).toEqual([]);
    expect(readFileSync(path.join(svnPath, 'app.txt'), 'utf8')).toBe('linha 1\nlinha 2 alterada\n');
    expect(existsSync(path.join(svnPath, 'antigo.txt'))).toBe(false);

    const validation = validateCommitPreConditions({ checkoutPath: svnPath });
    expect(validation.blockers).toEqual([]);
    expect(validation.canCommit).toBe(true);
    expect(validation.affectedFilesCount).toBe(4);

    const commit = executeCommit({ checkoutPath: svnPath, title: 'Ajusta app e reorganiza modulo.' });
    expect(commit.status).toBe('success');
    expect(commit.revision).toBe('2');

    const log = run('svn', ['log', '-v', '-r', '2', svnPath], svnPath);
    expect(log).toContain('A /modulo/novo.txt');
    expect(log).toContain('D /antigo.txt');
    expect(log).toContain('M /app.txt');

    const reapply = buildApplyPlan(planInput);
    expect(reapply.canConfirm).toBe(false);
  });
});
