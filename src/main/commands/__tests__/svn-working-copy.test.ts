import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { commitSelected, readWorkingCopyDiff, readWorkingCopyStatus } from '../svn-working-copy';

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
  return execFileSync('svn', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, LC_MESSAGES: 'C', LANGUAGE: '' } });
}

describeWithSvn('alterações do checkout e commit por seleção', () => {
  let root: string;
  let url: string;
  let wc: string;

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-wc-'));
    const repo = path.join(root, 'repo');
    execFileSync('svnadmin', ['create', repo]);
    url = `file://${repo}`;
    wc = path.join(root, 'wc');
    svn(['checkout', '--quiet', url, wc], root);
    mkdirSync(path.join(wc, 'dir'));
    mkdirSync(path.join(wc, 'old'));
    for (const [file, content] of [['a.txt', 'a1\n'], ['b.txt', 'b1\n'], ['dir/c.txt', 'c1\n'], ['old/x.txt', 'x\n'], ['old/y.txt', 'y\n']]) {
      writeFileSync(path.join(wc, file), content);
    }
    svn(['add', '--quiet', 'a.txt', 'b.txt', 'dir', 'old'], wc);
    svn(['commit', '--quiet', '-m', 'Inicial'], wc);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lista os tipos de alteração e commita só os arquivos selecionados', async () => {
    writeFileSync(path.join(wc, 'a.txt'), 'a2\n');
    writeFileSync(path.join(wc, 'b.txt'), 'b2\n');
    writeFileSync(path.join(wc, 'novo.txt'), 'linha 1\nlinha 2\n');
    mkdirSync(path.join(wc, 'pasta'));
    writeFileSync(path.join(wc, 'pasta', 'p1.txt'), 'p1\n');
    rmSync(path.join(wc, 'dir', 'c.txt'));
    svn(['delete', '--quiet', 'old'], wc);

    const status = await readWorkingCopyStatus(wc);
    const kinds = Object.fromEntries(status.changes.map((change) => [change.path, change.kind]));

    expect(status.ok).toBe(true);
    expect(status.url).toBe(url);
    expect(kinds).toMatchObject({ 'a.txt': 'modified', 'b.txt': 'modified', 'novo.txt': 'unversioned', pasta: 'unversioned', 'dir/c.txt': 'missing', old: 'deleted' });
    expect(status.changes.find((change) => change.path === 'novo.txt')?.defaultSelected).toBe(false);
    expect(status.changes.find((change) => change.path === 'a.txt')?.defaultSelected).toBe(true);

    const modifiedDiff = await readWorkingCopyDiff(wc, 'a.txt');
    expect(modifiedDiff.lines).toEqual(expect.arrayContaining(['-a1', '+a2']));
    const newDiff = await readWorkingCopyDiff(wc, 'novo.txt');
    expect(newDiff.lines).toEqual(['@@ -0,0 +1,2 @@', '+linha 1', '+linha 2']);
    expect((await readWorkingCopyDiff(wc, 'pasta')).kind).toBe('directory');

    expect((await commitSelected({ checkoutPath: wc, paths: ['a.txt'], message: '  ' })).errorCode).toBe('EMPTY_MESSAGE');
    expect((await commitSelected({ checkoutPath: wc, paths: ['../fora.txt'], message: 'x' })).errorCode).toBe('INVALID_SELECTION');

    const result = await commitSelected({ checkoutPath: wc, paths: ['a.txt', 'novo.txt', 'pasta', 'dir/c.txt', 'old'], message: 'Publica parte das alterações' });
    expect(result.ok).toBe(true);
    expect(result.revision).toBe('2');

    const log = svn(['log', '-v', '-r', '2', url], root);
    expect(log).toContain('M /a.txt');
    expect(log).toContain('A /novo.txt');
    expect(log).toContain('A /pasta/p1.txt');
    expect(log).toContain('D /dir/c.txt');
    expect(log).toContain('D /old');
    expect(log).not.toContain('/b.txt');

    const remaining = await readWorkingCopyStatus(wc);
    expect(remaining.changes.map((change) => `${change.path}:${change.kind}`)).toEqual(['b.txt:modified']);
  });

  it('avisa checkout desatualizado e bloqueia arquivo em conflito', async () => {
    const other = path.join(root, 'outro');
    svn(['checkout', '--quiet', url, other], root);
    writeFileSync(path.join(other, 'a.txt'), 'a3 de outra pessoa\n');
    svn(['commit', '--quiet', '-m', 'Outra pessoa'], other);

    writeFileSync(path.join(wc, 'a.txt'), 'a3 minha\n');
    const outOfDate = await commitSelected({ checkoutPath: wc, paths: ['a.txt'], message: 'Minha alteração' });
    expect(outOfDate.ok).toBe(false);
    expect(outOfDate.errorCode).toBe('OUT_OF_DATE');

    svn(['update', '--quiet', '--accept', 'postpone'], wc);
    const status = await readWorkingCopyStatus(wc);
    const conflicted = status.changes.find((change) => change.path === 'a.txt');
    expect(conflicted).toMatchObject({ kind: 'conflicted', selectable: false });
    expect(status.conflicts).toBe(1);

    expect((await commitSelected({ checkoutPath: wc, paths: ['a.txt'], message: 'Tenta' })).errorCode).toBe('CONFLICT_SELECTED');
  });
});
