import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { listGitBranches, switchGitBranch } from '../git-branches';

function run(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

describe('branches Git', () => {
  let root: string;
  let repo: string;

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-branches-'));
    const remote = path.join(root, 'remoto.git');
    const seed = path.join(root, 'seed');
    repo = path.join(root, 'repo');

    run(['init', '--quiet', '--bare', '--initial-branch=main', remote], root);
    run(['init', '--quiet', '--initial-branch=main', seed], root);
    run(['config', 'user.email', 'pessoa@exemplo.local'], seed);
    run(['config', 'user.name', 'Pessoa Teste'], seed);
    writeFileSync(path.join(seed, 'app.txt'), 'main\n');
    run(['add', '.'], seed);
    run(['commit', '--quiet', '-m', 'inicial'], seed);
    run(['checkout', '--quiet', '-b', 'release/1.0'], seed);
    writeFileSync(path.join(seed, 'app.txt'), 'release\n');
    run(['commit', '--quiet', '-am', 'release'], seed);
    run(['remote', 'add', 'origin', remote], seed);
    run(['push', '--quiet', 'origin', 'main', 'release/1.0'], seed);

    run(['clone', '--quiet', remote, repo], root);
    run(['config', 'user.email', 'pessoa@exemplo.local'], repo);
    run(['config', 'user.name', 'Pessoa Teste'], repo);
    run(['checkout', '--quiet', '-b', 'feature/x'], repo);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lista branches locais e só as remotas sem cópia local', () => {
    const branches = listGitBranches(repo);

    expect(branches.ok).toBe(true);
    expect(branches.current).toBe('feature/x');
    expect(branches.local.map((branch) => branch.name).sort()).toEqual(['feature/x', 'main']);
    expect(branches.remote.map((branch) => branch.name)).toEqual(['origin/release/1.0']);
  });

  it('troca de branch, bloqueia com alteração pendente e cria a partir da remota', () => {
    expect(switchGitBranch({ gitRepositoryPath: repo, branch: 'main', kind: 'local' })).toMatchObject({ ok: true, branch: 'main' });

    writeFileSync(path.join(repo, 'app.txt'), 'alterado sem commit\n');
    const blocked = switchGitBranch({ gitRepositoryPath: repo, branch: 'feature/x', kind: 'local' });
    expect(blocked).toMatchObject({ ok: false, errorCode: 'UNCOMMITTED_CHANGES', changedFiles: ['app.txt'] });
    expect(run(['branch', '--show-current'], repo).trim()).toBe('main');
    run(['checkout', '--', 'app.txt'], repo);

    writeFileSync(path.join(repo, 'novo-nao-versionado.txt'), 'x\n');
    const fromRemote = switchGitBranch({ gitRepositoryPath: repo, branch: 'origin/release/1.0', kind: 'remote' });
    expect(fromRemote).toMatchObject({ ok: true, branch: 'release/1.0' });
    expect(listGitBranches(repo).remote).toEqual([]);

    expect(switchGitBranch({ gitRepositoryPath: repo, branch: '--orphan', kind: 'local' }).errorCode).toBe('BRANCH_NOT_FOUND');
  });
});
