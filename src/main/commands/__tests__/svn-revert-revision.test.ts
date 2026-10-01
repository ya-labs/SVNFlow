import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { checkoutProject } from '../svn-checkout';
import { readWorkingCopyStatus, revertRevision } from '../svn-working-copy';

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

describeWithSvn('desfazer revisão e checkout em revisão antiga', () => {
  let root: string;
  let url: string;
  let wc: string;

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-revert-'));
    execFileSync('svnadmin', ['create', path.join(root, 'repo')]);
    url = `file://${path.join(root, 'repo')}`;
    wc = path.join(root, 'wc');
    svn(['checkout', '--quiet', url, wc], root);
    writeFileSync(path.join(wc, 'a.txt'), 'original\n');
    svn(['add', '--quiet', 'a.txt'], wc);
    svn(['commit', '--quiet', '-m', 'r1: cria a'], wc);
    writeFileSync(path.join(wc, 'a.txt'), 'mudança ruim\n');
    writeFileSync(path.join(wc, 'b.txt'), 'b\n');
    svn(['add', '--quiet', 'b.txt'], wc);
    svn(['commit', '--quiet', '-m', 'r2: muda a e cria b'], wc);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('pede update quando o checkout tem revisões misturadas depois de um commit', async () => {
    const result = await revertRevision({ checkoutPath: wc, revision: '2' });
    expect(result.errorCode).toBe('NEEDS_UPDATE');
  });

  it('desfaz a revisão no checkout sem publicar', async () => {
    svn(['update', '--quiet'], wc);
    const result = await revertRevision({ checkoutPath: wc, revision: '2' });

    expect(result.ok).toBe(true);
    expect(result.changed).toEqual(expect.arrayContaining(['a.txt', 'b.txt']));
    expect(readFileSync(path.join(wc, 'a.txt'), 'utf8')).toBe('original\n');

    const status = await readWorkingCopyStatus(wc);
    expect(status.changes.map((change) => `${change.path}:${change.kind}`).sort()).toEqual(['a.txt:modified', 'b.txt:deleted']);
    expect(svn(['log', '-q', '-r', 'HEAD', url], root)).toContain('r2');
    expect((await revertRevision({ checkoutPath: wc, revision: 'abc' })).errorCode).toBe('INVALID_REVISION');
    svn(['revert', '--quiet', '-R', '.'], wc);
  });

  it('faz checkout de uma revisão antiga', async () => {
    const result = await checkoutProject({ url, destination: path.join(root, 'antigo-r1'), revision: '1' });

    expect(result.ok).toBe(true);
    expect(result.revision).toBe('1');
    expect(readFileSync(path.join(root, 'antigo-r1', 'a.txt'), 'utf8')).toBe('original\n');
  });
});
