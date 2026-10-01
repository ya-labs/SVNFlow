import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { linkGitToSavedEnvironment } from '../register-saved-environment';
import { readSavedEnvironments, writeSavedEnvironments } from '../saved-environment-store';

describe('vincular Git a projeto SVN', () => {
  let root: string;
  let storagePath: string;
  let gitPath: string;

  beforeAll(async () => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-link-'));
    storagePath = path.join(root, 'saved-environments.json');
    gitPath = path.join(root, 'git');
    mkdirSync(gitPath);
    execFileSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: gitPath });
    execFileSync('git', ['-c', 'user.email=p@exemplo.local', '-c', 'user.name=P', 'commit', '--quiet', '--allow-empty', '-m', 'inicial'], { cwd: gitPath });
    writeFileSync(path.join(root, 'nao-git.txt'), 'x');
    await writeSavedEnvironments([{ id: 'p1', name: 'Projeto', svnCheckoutPath: '/svn/projeto', lastSyncedGitCommit: 'abc' }], { storagePath });
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('valida, vincula e desvincula o repositório Git', async () => {
    const invalid = await linkGitToSavedEnvironment({ environmentId: 'p1', gitWorkspacePath: root, storagePath });
    expect(invalid.ok).toBe(false);
    expect(invalid.blockers[0].code).toBe('INVALID_GIT_WORKSPACE');

    const wrongBase = await linkGitToSavedEnvironment({ environmentId: 'p1', gitWorkspacePath: gitPath, baseBranch: 'develop', storagePath });
    expect(wrongBase.blockers[0].code).toBe('INVALID_BASE_BRANCH');

    expect((await linkGitToSavedEnvironment({ environmentId: 'p1', gitWorkspacePath: gitPath, storagePath })).ok).toBe(true);
    let saved = (await readSavedEnvironments({ storagePath })).environments[0];
    expect(saved).toMatchObject({ gitWorkspacePath: gitPath, baseBranch: 'main' });
    expect(saved.lastSyncedGitCommit).toBeUndefined();

    expect((await linkGitToSavedEnvironment({ environmentId: 'p1', gitWorkspacePath: '', storagePath })).ok).toBe(true);
    saved = (await readSavedEnvironments({ storagePath })).environments[0];
    expect(saved.gitWorkspacePath).toBeUndefined();
    expect(saved.svnCheckoutPath).toBe('/svn/projeto');
  });
});
