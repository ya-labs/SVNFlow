import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { executeCommit } from '../commit-executor';
import { buildSyncPlan, executeSync, suggestSyncCommitMessage } from '../git-svn-sync';

function commandAvailable(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const describeWithTools = commandAvailable('git', ['--version'])
  && commandAvailable('svn', ['--version', '--quiet'])
  && commandAvailable('svnadmin', ['--version', '--quiet'])
  ? describe
  : describe.skip;

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function commitAll(gitPath: string, message: string): string {
  run('git', ['add', '-A'], gitPath);
  run('git', ['commit', '--quiet', '-m', message], gitPath);
  return run('git', ['rev-parse', 'HEAD'], gitPath).trim();
}

describeWithTools('sincronização Git -> SVN por espelhamento', () => {
  let root: string;
  let gitPath: string;
  let svnPath: string;

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-sync-'));
    gitPath = path.join(root, 'git');
    svnPath = path.join(root, 'svn');

    run('svnadmin', ['create', path.join(root, 'repo')], root);
    run('svn', ['checkout', '--quiet', `file://${path.join(root, 'repo')}`, svnPath], root);

    mkdirSync(path.join(gitPath, 'src', 'antigo'), { recursive: true });
    run('git', ['init', '--quiet', '--initial-branch=main'], gitPath);
    run('git', ['config', 'user.email', 'pessoa@exemplo.local'], gitPath);
    run('git', ['config', 'user.name', 'Pessoa Teste'], gitPath);
    writeFileSync(path.join(gitPath, 'README.md'), '# Projeto\n');
    writeFileSync(path.join(gitPath, 'src', 'app.js'), 'console.log(1);\n');
    writeFileSync(path.join(gitPath, 'src', 'antigo', 'velho.js'), 'velho\n');
    writeFileSync(path.join(gitPath, 'remover.txt'), 'sai\n');
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('espelha o último commit no checkout, remove o que saiu do Git e commita', () => {
    const firstCommit = commitAll(gitPath, 'feat: estrutura inicial');

    const firstPlan = buildSyncPlan({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath });
    expect(firstPlan.status).toBe('ready');
    expect(firstPlan.totals).toEqual({ added: 4, modified: 0, deleted: 0 });

    expect(executeSync({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, confirmed: false }).ok).toBe(false);
    expect(existsSync(path.join(svnPath, 'README.md'))).toBe(false);

    const firstSync = executeSync({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, confirmed: true });
    expect(firstSync.errors).toEqual([]);
    expect(executeCommit({ checkoutPath: svnPath, title: 'Estrutura inicial' }).status).toBe('success');

    writeFileSync(path.join(gitPath, 'src', 'app.js'), 'console.log(2);\n');
    rmSync(path.join(gitPath, 'remover.txt'));
    rmSync(path.join(gitPath, 'src', 'antigo'), { recursive: true });
    commitAll(gitPath, 'fix: ajusta app');
    writeFileSync(path.join(gitPath, 'src', 'novo.js'), 'novo\n');
    const lastCommit = commitAll(gitPath, 'feat: adiciona `novo` e $(rm -rf /) de mentira');
    writeFileSync(path.join(gitPath, 'rascunho.txt'), 'não commitado\n');

    const plan = buildSyncPlan({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath });
    expect(plan.changes).toEqual([
      { path: 'remover.txt', kind: 'deleted' },
      { path: 'src/antigo', kind: 'deleted' },
      { path: 'src/antigo/velho.js', kind: 'deleted' },
      { path: 'src/app.js', kind: 'modified' },
      { path: 'src/novo.js', kind: 'added' }
    ]);
    expect(plan.warnings.some((warning) => warning.includes('não commitada'))).toBe(true);

    const sync = executeSync({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, confirmed: true });
    expect(sync.errors).toEqual([]);
    expect(readFileSync(path.join(svnPath, 'src', 'app.js'), 'utf8')).toBe('console.log(2);\n');
    expect(existsSync(path.join(svnPath, 'rascunho.txt'))).toBe(false);

    const upToDate = buildSyncPlan({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath });
    expect(upToDate.status).toBe('up-to-date');
    expect(upToDate.pendingSvnChanges).toBeGreaterThan(0);

    const message = suggestSyncCommitMessage({ gitWorkspacePath: gitPath, commit: lastCommit, lastSyncedCommit: firstCommit });
    expect(message.split('\n')[0]).toBe('feat: adiciona `novo` e $(rm -rf /) de mentira (+1 commit(s))');
    expect(message).toContain('fix: ajusta app');

    const commit = executeCommit({ checkoutPath: svnPath, title: message });
    expect(commit.status).toBe('success');
    expect(run('svn', ['log', '-r', 'HEAD', svnPath], svnPath)).toContain('$(rm -rf /) de mentira');

    const log = run('svn', ['log', '-v', '-r', commit.revision!, svnPath], svnPath);
    expect(log).toContain('D /src/antigo');
    expect(log).toContain('D /remover.txt');
    expect(log).toContain('A /src/novo.js');
    expect(log).toContain('M /src/app.js');

    expect(buildSyncPlan({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath }).message).toContain('Nada a sincronizar');
  });
});
