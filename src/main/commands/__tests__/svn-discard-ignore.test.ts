import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { addToSvnIgnore, commitSelected, discardChanges, readWorkingCopyDiff, readWorkingCopyStatus, setIgnoreOnCommit } from '../svn-working-copy';

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

describeWithSvn('descartar e ignorar alterações', () => {
  let root: string;
  let wc: string;
  let trash: string;
  const moveToTrash = async (target: string) => {
    renameSync(target, path.join(trash, `${readdirSync(trash).length}-${path.basename(target)}`));
  };

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-discard-'));
    trash = path.join(root, 'lixeira');
    mkdirSync(trash);
    const repo = path.join(root, 'repo');
    execFileSync('svnadmin', ['create', repo]);
    wc = path.join(root, 'wc');
    svn(['checkout', '--quiet', `file://${repo}`, wc], root);
    mkdirSync(path.join(wc, 'dir'));
    for (const [file, content] of [['a.txt', 'a1\n'], ['b.txt', 'b1\n'], ['c.txt', 'c1\n'], ['dir/d.txt', 'd1\n']]) {
      writeFileSync(path.join(wc, file), content);
    }
    svn(['add', '--quiet', 'a.txt', 'b.txt', 'c.txt', 'dir'], wc);
    svn(['commit', '--quiet', '-m', 'Inicial'], wc);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('descarta cada tipo de alteração e guarda o conteúdo na Lixeira', async () => {
    writeFileSync(path.join(wc, 'a.txt'), 'a2 que vou descartar\n');
    writeFileSync(path.join(wc, 'novo.txt'), 'novo\n');
    svn(['add', '--quiet', 'novo.txt'], wc);
    writeFileSync(path.join(wc, 'solto.log'), 'log\n');
    mkdirSync(path.join(wc, 'pasta-nova'));
    writeFileSync(path.join(wc, 'pasta-nova', 'x.txt'), 'x\n');
    svn(['delete', '--quiet', 'c.txt'], wc);
    rmSync(path.join(wc, 'dir', 'd.txt'));

    const result = await discardChanges({ checkoutPath: wc, paths: ['a.txt', 'novo.txt', 'solto.log', 'pasta-nova', 'c.txt', 'dir/d.txt'], moveToTrash });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);

    expect(readFileSync(path.join(wc, 'a.txt'), 'utf8')).toBe('a1\n');
    expect(readFileSync(path.join(wc, 'c.txt'), 'utf8')).toBe('c1\n');
    expect(readFileSync(path.join(wc, 'dir', 'd.txt'), 'utf8')).toBe('d1\n');
    expect(existsSync(path.join(wc, 'novo.txt'))).toBe(false);
    expect(existsSync(path.join(wc, 'solto.log'))).toBe(false);
    expect(existsSync(path.join(wc, 'pasta-nova'))).toBe(false);

    const trashed = readdirSync(trash).map((name) => name.replace(/^\d+-/, ''));
    expect(trashed).toEqual(expect.arrayContaining(['a.txt', 'novo.txt', 'solto.log', 'pasta-nova']));
    const backup = readdirSync(trash).find((name) => name.endsWith('a.txt'))!;
    expect(readFileSync(path.join(trash, backup), 'utf8')).toBe('a2 que vou descartar\n');

    expect((await readWorkingCopyStatus(wc)).changes).toEqual([]);
    expect((await discardChanges({ checkoutPath: wc, paths: ['../fora'], moveToTrash })).errorCode).toBe('INVALID_SELECTION');
  });

  it('adiciona itens novos ao svn:ignore e recusa versionados', async () => {
    mkdirSync(path.join(wc, 'build'));
    writeFileSync(path.join(wc, 'build', 'saida.js'), 'x\n');
    writeFileSync(path.join(wc, 'rascunho.tmp'), 't\n');

    expect((await addToSvnIgnore({ checkoutPath: wc, path: 'build', mode: 'item' })).ok).toBe(true);
    expect((await addToSvnIgnore({ checkoutPath: wc, path: 'rascunho.tmp', mode: 'extension' })).ok).toBe(true);
    writeFileSync(path.join(wc, 'outro.tmp'), 't\n');

    const status = await readWorkingCopyStatus(wc);
    expect(status.changes.map((change) => `${change.path}:${change.kind}:${change.propertiesOnly}`)).toEqual(['.:modified:true']);
    expect(svn(['propget', 'svn:ignore', '.'], wc).trim().split('\n')).toEqual(['build', '*.tmp']);

    const diff = await readWorkingCopyDiff(wc, '.');
    expect(diff.kind).toBe('text');
    expect(diff.lines).toEqual(expect.arrayContaining(['\\ Propriedade svn:ignore', '+build', '+*.tmp']));

    writeFileSync(path.join(wc, 'b.txt'), 'b2\n');
    const versioned = await addToSvnIgnore({ checkoutPath: wc, path: 'b.txt', mode: 'item' });
    expect(versioned.ok).toBe(false);
    expect(versioned.message).toContain('Ignorar no commit');

    const committed = await commitSelected({ checkoutPath: wc, paths: ['.'], message: 'Ignora build e *.tmp' });
    expect(committed.ok).toBe(true);
    expect((await readWorkingCopyStatus(wc)).changes.map((change) => change.path)).toEqual(['b.txt']);
  });

  it('ignora no commit arquivo e pasta versionados, mantendo a marca depois do commit', async () => {
    writeFileSync(path.join(wc, 'a.txt'), 'a3\n');
    expect((await setIgnoreOnCommit({ checkoutPath: wc, path: 'b.txt', ignore: true })).ok).toBe(true);

    let status = await readWorkingCopyStatus(wc);
    expect(status.changes.map((change) => `${change.path}:${change.ignoredOnCommit}:${change.defaultSelected}`)).toEqual(['a.txt:false:true', 'b.txt:true:false']);

    expect((await commitSelected({ checkoutPath: wc, paths: ['b.txt'], message: 'Publica b mesmo assim' })).ok).toBe(true);
    writeFileSync(path.join(wc, 'b.txt'), 'b3\n');
    status = await readWorkingCopyStatus(wc);
    expect(status.changes.find((change) => change.path === 'b.txt')?.ignoredOnCommit).toBe(true);

    expect((await setIgnoreOnCommit({ checkoutPath: wc, path: 'dir', ignore: true, recursive: true })).ok).toBe(true);
    writeFileSync(path.join(wc, 'dir', 'd.txt'), 'd2\n');
    status = await readWorkingCopyStatus(wc);
    expect(status.changes.find((change) => change.path === 'dir/d.txt')?.ignoredOnCommit).toBe(true);

    expect((await setIgnoreOnCommit({ checkoutPath: wc, path: 'b.txt', ignore: false })).ok).toBe(true);
    status = await readWorkingCopyStatus(wc);
    expect(status.changes.find((change) => change.path === 'b.txt')?.ignoredOnCommit).toBe(false);
    expect((await setIgnoreOnCommit({ checkoutPath: wc, path: '../x', ignore: true })).ok).toBe(false);
  });
});
