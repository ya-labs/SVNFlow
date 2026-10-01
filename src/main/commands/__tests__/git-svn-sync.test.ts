import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { executeCommit } from '../commit-executor';
import { buildFileDiff, buildSyncPlan, executeSync, suggestSyncCommitMessage } from '../git-svn-sync';

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

    const diffBefore = buildFileDiff({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, filePath: 'src/app.js' });
    expect(diffBefore.source).toBe('git-vs-checkout');
    expect(diffBefore.lines).toEqual(expect.arrayContaining(['-console.log(1);', '+console.log(2);']));
    expect(buildFileDiff({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, filePath: 'src/antigo' }).kind).toBe('directory');

    const sync = executeSync({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, confirmed: true });
    expect(sync.errors).toEqual([]);
    expect(readFileSync(path.join(svnPath, 'src', 'app.js'), 'utf8')).toBe('console.log(2);\n');
    expect(existsSync(path.join(svnPath, 'rascunho.txt'))).toBe(false);

    const diffPending = buildFileDiff({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, filePath: 'src/app.js' });
    expect(diffPending.source).toBe('svn-pending');
    expect(diffPending.lines).toEqual(expect.arrayContaining(['+console.log(2);']));

    const upToDate = buildSyncPlan({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath });
    expect(upToDate.status).toBe('up-to-date');
    expect(upToDate.pendingSvnChanges).toBeGreaterThan(0);
    expect(upToDate.pending.map((change) => change.path)).toEqual(expect.arrayContaining(['src/app.js', 'src/novo.js', 'remover.txt']));

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
  it('espelha adições e remoções com @ e mantém a prévia do diff local', () => {
    const name = 'src/icone@2x.txt';
    writeFileSync(path.join(gitPath, name), 'inicial\n');
    commitAll(gitPath, 'feat: adiciona arquivo com @');
    expect(executeSync({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, confirmed: true }).errors).toEqual([]);
    expect(executeCommit({ checkoutPath: svnPath, title: 'Adiciona ícone' }).status).toBe('success');

    writeFileSync(path.join(gitPath, name), 'modificado\n');
    commitAll(gitPath, 'fix: modifica arquivo com @');
    expect(executeSync({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, confirmed: true }).errors).toEqual([]);
    const diff = buildFileDiff({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, filePath: name });
    expect(diff.source).toBe('svn-pending');
    expect(diff.lines).toEqual(expect.arrayContaining(['-inicial', '+modificado']));
    expect(executeCommit({ checkoutPath: svnPath, title: 'Modifica ícone' }).status).toBe('success');

    rmSync(path.join(gitPath, name));
    commitAll(gitPath, 'fix: remove arquivo com @');
    expect(executeSync({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, confirmed: true }).errors).toEqual([]);
    expect(executeCommit({ checkoutPath: svnPath, title: 'Remove ícone' }).status).toBe('success');
    expect(existsSync(path.join(svnPath, name))).toBe(false);
  });

  it('não copia regras "Não copiar para o SVN" nem pastas .svn versionadas no Git', () => {
    mkdirSync(path.join(gitPath, '.svn', 'pristine', 'ab'), { recursive: true });
    mkdirSync(path.join(gitPath, '.idea', 'caches'), { recursive: true });
    mkdirSync(path.join(gitPath, 'config'), { recursive: true });
    writeFileSync(path.join(gitPath, '.svn', 'pristine', 'ab', 'abc.svn-base'), 'metadado\n');
    writeFileSync(path.join(gitPath, '.idea', 'caches', 'estado.xml'), '<x/>\n');
    writeFileSync(path.join(gitPath, 'config', 'local.json'), '{}\n');
    writeFileSync(path.join(gitPath, 'config', 'publico.json'), '{}\n');
    commitAll(gitPath, 'chore: arquivos que não vão para o SVN');

    const exclusions = ['.idea', 'config/local.json'];
    const plan = buildSyncPlan({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, exclusions });
    expect(plan.changes).toEqual([{ path: 'config/publico.json', kind: 'added' }]);
    expect(plan.exclusions).toEqual(exclusions);
    expect(plan.warnings.join(' ')).toContain('.svn');
    expect(plan.warnings.join(' ')).toContain('2 arquivo(s) do Git ficam fora da cópia');

    expect(executeSync({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, exclusions, confirmed: true }).errors).toEqual([]);
    expect(existsSync(path.join(svnPath, '.svn', 'pristine', 'ab', 'abc.svn-base'))).toBe(false);
    expect(existsSync(path.join(svnPath, '.idea'))).toBe(false);
    expect(existsSync(path.join(svnPath, 'config', 'local.json'))).toBe(false);
    expect(executeCommit({ checkoutPath: svnPath, title: 'Publica config' }).status).toBe('success');

    // Regra de pasta também impede remover do SVN o que saiu do Git.
    rmSync(path.join(gitPath, 'config', 'publico.json'));
    commitAll(gitPath, 'chore: remove config pública');
    expect(buildSyncPlan({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, exclusions: ['.idea', 'config'] }).status).toBe('up-to-date');
    // A pasta segue no Git por causa do arquivo excluído: sai só o arquivo, não a pasta.
    expect(buildSyncPlan({ gitWorkspacePath: gitPath, svnCheckoutPath: svnPath, exclusions }).changes).toEqual([{ path: 'config/publico.json', kind: 'deleted' }]);
  });
});
