import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readLog, readRevisionDiff } from '../svn-history';

function hasCommand(command: string): boolean {
  try {
    execFileSync(command, ['--version', '--quiet'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const describeWithSvn = hasCommand('svn') && hasCommand('svnadmin') ? describe : describe.skip;

function svn(args: string[], cwd: string): string {
  return execFileSync('svn', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

describeWithSvn('histórico SVN', () => {
  let root: string;
  let rootUrl: string;
  let wc: string;

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-log-'));
    const repo = path.join(root, 'repo');
    execFileSync('svnadmin', ['create', repo]);
    rootUrl = `file://${repo}`;

    const seed = path.join(root, 'seed');
    svn(['checkout', '--quiet', rootUrl, seed], root);
    mkdirSync(path.join(seed, 'app', 'trunk'), { recursive: true });
    mkdirSync(path.join(seed, 'outro'));
    writeFileSync(path.join(seed, 'app', 'trunk', 'main.js'), 'v1\n');
    svn(['add', '--quiet', 'app', 'outro'], seed);
    svn(['commit', '--quiet', '-m', 'r1: estrutura'], seed);

    for (let revision = 2; revision <= 3; revision += 1) {
      writeFileSync(path.join(seed, 'app', 'trunk', 'main.js'), `v${revision}\n`);
      svn(['commit', '--quiet', '-m', `r${revision}: versão ${revision}`], seed);
    }

    wc = path.join(root, 'wc');
    svn(['checkout', '--quiet', `${rootUrl}/app/trunk`, wc], root);

    writeFileSync(path.join(seed, 'outro', 'x.txt'), 'x\n');
    svn(['add', '--quiet', path.join('outro', 'x.txt')], seed);
    svn(['commit', '--quiet', '-m', 'r4: outro projeto'], seed);

    for (let revision = 5; revision <= 6; revision += 1) {
      writeFileSync(path.join(seed, 'app', 'trunk', 'main.js'), `v${revision}\n`);
      svn(['commit', '--quiet', '-m', `r${revision}: versão ${revision}\n\nDetalhe da versão ${revision}.`], seed);
    }
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lê o log do servidor pela URL do checkout, com paginação', async () => {
    const first = await readLog({ checkoutPath: wc, limit: 2 });

    expect(first.ok).toBe(true);
    expect(first.workingCopyRevision).toBe('3');
    expect(first.projectPath).toBe('/app/trunk');
    expect(first.entries.map((entry) => entry.revision)).toEqual(['6', '5']);
    expect(first.hasMore).toBe(true);
    expect(first.entries[0].message).toBe('r6: versão 6\n\nDetalhe da versão 6.');
    expect(first.entries[0].paths).toEqual([expect.objectContaining({ action: 'M', path: '/app/trunk/main.js' })]);

    const second = await readLog({ checkoutPath: wc, limit: 2, before: '4' });
    // r4 mexeu só em outro projeto e não aparece no log de app/trunk.
    expect(second.entries.map((entry) => entry.revision)).toEqual(['3', '2']);
    expect(second.hasMore).toBe(true);

    const last = await readLog({ checkoutPath: wc, limit: 5, before: '1' });
    expect(last.entries.map((entry) => entry.revision)).toEqual(['1']);
    expect(last.hasMore).toBe(false);

    expect((await readLog({ checkoutPath: wc, before: '0' })).entries).toEqual([]);
    expect((await readLog({ checkoutPath: wc, before: '3; rm' })).errorCode).toBe('INVALID_REVISION');
  });

  it('lê o log remoto sem checkout e o diff de uma revisão', async () => {
    const remote = await readLog({ url: `${rootUrl}/app/trunk`, limit: 10 });
    expect(remote.ok).toBe(true);
    expect(remote.workingCopyRevision).toBeUndefined();
    expect(remote.entries.map((entry) => entry.revision)).toEqual(['6', '5', '3', '2', '1']);

    const diff = await readRevisionDiff({ repositoryRoot: remote.repositoryRoot!, revision: '5', path: '/app/trunk/main.js' });
    expect(diff.kind).toBe('text');
    expect(diff.lines).toEqual(expect.arrayContaining(['-v3', '+v5']));

    expect((await readRevisionDiff({ repositoryRoot: remote.repositoryRoot!, revision: '5', path: '/../etc' })).kind).toBe('empty');
    expect((await readRevisionDiff({ repositoryRoot: remote.repositoryRoot!, revision: 'x', path: '/app' })).kind).toBe('empty');
  });
});
