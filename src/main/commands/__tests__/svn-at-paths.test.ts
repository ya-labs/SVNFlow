import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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
  return execFileSync('svn', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, LC_MESSAGES: 'C', LANGUAGE: '' } });
}

describeWithSvn('caminhos locais com @ no SVN', () => {
  let root: string;
  let wc: string;
  let url: string;
  const names = ['icon-20@2x.png', 'ícone com espaço@3x.txt', 'vários@@.txt', 'final@'];

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-at-'));
    const repo = path.join(root, 'repo');
    execFileSync('svnadmin', ['create', repo]);
    url = `file://${repo}`;
    wc = path.join(root, 'wc');
    svn(['checkout', '--quiet', url, wc], root);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('adiciona, modifica e remove nomes literais sem incluir arquivos não selecionados', async () => {
    for (const name of names) writeFileSync(path.join(wc, name), 'inicial\n');
    writeFileSync(path.join(wc, 'pendente@2x.txt'), 'fora do commit\n');

    expect((await readWorkingCopyDiff(wc, names[1])).lines).toContain('+inicial');
    // Exercita também arquivo que já estava agendado para adição.
    svn(['add', '--', `${names[0]}@`], wc);
    const added = await commitSelected({ checkoutPath: wc, paths: names, message: 'Adiciona ícones @2x' });
    expect(added.ok).toBe(true);
    expect(added.committed).toEqual(expect.arrayContaining(names));
    expect(svn(['log', '-v', '-r', added.revision!, url], root)).not.toContain('/pendente@2x.txt');

    for (const name of names) writeFileSync(path.join(wc, name), 'modificado\n');
    const diff = await readWorkingCopyDiff(wc, names[0]);
    expect(diff.lines).toEqual(expect.arrayContaining(['-inicial', '+modificado']));
    const modified = await commitSelected({ checkoutPath: wc, paths: names, message: 'Modifica ícones' });
    expect(modified.ok).toBe(true);
    for (const name of names) {
      expect(svn(['cat', '--', `${name}@`], wc)).toBe('modificado\n');
      rmSync(path.join(wc, name));
    }

    expect((await commitSelected({ checkoutPath: wc, paths: names, message: 'Remove ícones' })).ok).toBe(true);
    expect((await readWorkingCopyStatus(wc)).changes.map(change => change.path)).toEqual(['pendente@2x.txt']);
  });

  it('inclui ancestrais novos com @ sem arrastar irmãos não selecionados', async () => {
    mkdirSync(path.join(wc, 'resources@ios'));
    writeFileSync(path.join(wc, 'resources@ios', names[0]), 'selecionado\n');
    writeFileSync(path.join(wc, 'resources@ios', 'outro@3x.png'), 'pendente\n');
    // A adição da pasta torna os dois arquivos visíveis na seleção.
    svn(['add', '--', 'resources@ios@'], wc);
    const target = `resources@ios/${names[0]}`;
    const result = await commitSelected({ checkoutPath: wc, paths: [target], message: 'Publica um ícone' });
    expect(result.ok).toBe(true);
    expect(result.committed).toEqual(['resources@ios', target]);
    expect((await readWorkingCopyStatus(wc)).changes.map(change => change.path)).toEqual(['resources@ios/outro@3x.png']);
  });

  it('descarta e alterna ignorar no commit para arquivo com @', async () => {
    const name = names[0];
    writeFileSync(path.join(wc, name), 'inicial\n');
    expect((await commitSelected({ checkoutPath: wc, paths: [name], message: 'Inicial' })).ok).toBe(true);
    writeFileSync(path.join(wc, name), 'descartado\n');
    expect((await setIgnoreOnCommit({ checkoutPath: wc, path: name, ignore: true })).ok).toBe(true);
    expect((await readWorkingCopyStatus(wc)).changes[0].ignoredOnCommit).toBe(true);
    expect((await setIgnoreOnCommit({ checkoutPath: wc, path: name, ignore: false })).ok).toBe(true);
    expect((await readWorkingCopyStatus(wc)).changes[0].ignoredOnCommit).toBe(false);

    const result = await discardChanges({ checkoutPath: wc, paths: [name], moveToTrash: async target => { renameSync(target, path.join(root, 'backup')); } });
    expect(result.errors).toEqual([]);
    expect(readFileSync(path.join(wc, name), 'utf8')).toBe('inicial\n');
    expect(readFileSync(path.join(root, 'backup'), 'utf8')).toBe('descartado\n');
  });

  it('lê, publica e descarta propriedades de pasta com @', async () => {
    mkdirSync(path.join(wc, 'pasta@teste'));
    svn(['add', '--', 'pasta@teste@'], wc);
    svn(['commit', '-m', 'Pasta inicial'], wc);
    const target = 'pasta@teste/rascunho@2x.tmp';
    writeFileSync(path.join(wc, target), 'rascunho\n');
    expect((await addToSvnIgnore({ checkoutPath: wc, path: target, mode: 'item' })).ok).toBe(true);
    expect((await readWorkingCopyStatus(wc)).changes.map(change => change.path)).toEqual(['pasta@teste']);
    expect((await readWorkingCopyDiff(wc, 'pasta@teste')).lines).toContain('+rascunho@2x.tmp');
    expect((await commitSelected({ checkoutPath: wc, paths: ['pasta@teste'], message: 'Ignora rascunho @2x' })).ok).toBe(true);
    expect(svn(['propget', 'svn:ignore', '--', 'pasta@teste@'], wc).trim()).toBe('rascunho@2x.tmp');
    expect(existsSync(path.join(wc, target))).toBe(true);

    const other = 'pasta@teste/outro@3x.tmp';
    writeFileSync(path.join(wc, other), 'outro\n');
    expect((await addToSvnIgnore({ checkoutPath: wc, path: other, mode: 'item' })).ok).toBe(true);
    expect((await discardChanges({ checkoutPath: wc, paths: ['pasta@teste'], moveToTrash: async () => {} })).ok).toBe(true);
    expect(svn(['propget', 'svn:ignore', '--', 'pasta@teste@'], wc).trim()).toBe('rascunho@2x.tmp');
  });
});
