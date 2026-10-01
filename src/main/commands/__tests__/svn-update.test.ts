import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { countIncoming, readConflictHunks, readWorkingCopyStatus, resolveConflict, updateWorkingCopy } from '../svn-working-copy';

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

describeWithSvn('atualizar checkout (svn update)', () => {
  let root: string;
  let projectUrl: string;
  let mine: string;
  let other: string;

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-update-'));
    const repo = path.join(root, 'repo');
    execFileSync('svnadmin', ['create', repo]);
    const seed = path.join(root, 'seed');
    svn(['checkout', '--quiet', `file://${repo}`, seed], root);
    mkdirSync(path.join(seed, 'app'));
    mkdirSync(path.join(seed, 'outro'));
    writeFileSync(path.join(seed, 'app', 'a.txt'), 'linha original\n');
    svn(['add', '--quiet', 'app', 'outro'], seed);
    svn(['commit', '--quiet', '-m', 'Inicial'], seed);
    projectUrl = `file://${repo}/app`;

    mine = path.join(root, 'meu');
    other = path.join(root, 'outra-pessoa');
    svn(['checkout', '--quiet', projectUrl, mine], root);
    svn(['checkout', '--quiet', projectUrl, other], root);

    // Commit em outro projeto do mesmo repositório não conta como novidade.
    writeFileSync(path.join(seed, 'outro', 'x.txt'), 'x\n');
    svn(['add', '--quiet', path.join('outro', 'x.txt')], seed);
    svn(['commit', '--quiet', '-m', 'Outro projeto'], seed);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('conta revisões novas do projeto e atualiza o checkout', async () => {
    expect(await countIncoming(mine)).toMatchObject({ ok: true, incoming: 0, workingCopyRevision: '1' });

    writeFileSync(path.join(other, 'a.txt'), 'linha original\nlinha nova\n');
    svn(['commit', '--quiet', '-m', 'Altera a'], other);
    writeFileSync(path.join(other, 'b.txt'), 'b\n');
    svn(['add', '--quiet', 'b.txt'], other);
    svn(['commit', '--quiet', '-m', 'Cria b'], other);

    const incoming = await countIncoming(mine);
    expect(incoming).toMatchObject({ ok: true, incoming: 2, workingCopyRevision: '1', headRevision: '4' });

    const update = await updateWorkingCopy(mine);
    expect(update.ok).toBe(true);
    expect(update.revision).toBe('4');
    expect(update.updated).toEqual(expect.arrayContaining([{ action: 'U', path: 'a.txt' }, { action: 'A', path: 'b.txt' }]));
    expect(update.conflicts).toEqual([]);
    expect(readFileSync(path.join(mine, 'a.txt'), 'utf8')).toBe('linha original\nlinha nova\n');
    expect((await countIncoming(mine)).incoming).toBe(0);
  });

  it('não conta como novidade a revisão publicada a partir do próprio checkout', async () => {
    writeFileSync(path.join(mine, 'b.txt'), 'b meu\n');
    const output = svn(['commit', '-m', 'Meu commit'], mine);
    const revision = output.match(/(?:Committed revision|revisão) (\d+)/i)?.[1] ?? '';
    expect(revision).not.toBe('');

    expect((await countIncoming(mine)).incoming).toBe(1);
    expect((await countIncoming(mine, { localRevisions: [revision] })).incoming).toBe(0);
  });

  it('marca conflito sem resolver sozinho e bloqueia novo update', async () => {
    writeFileSync(path.join(other, 'a.txt'), 'versão da outra pessoa\n');
    svn(['commit', '--quiet', '-m', 'Outra pessoa muda a'], other);
    writeFileSync(path.join(mine, 'a.txt'), 'minha versão\n');

    const update = await updateWorkingCopy(mine);
    expect(update.ok).toBe(true);
    expect(update.conflicts).toEqual(['a.txt']);
    expect(update.message).toContain('conflito');

    const status = await readWorkingCopyStatus(mine);
    expect(status.conflicts).toBe(1);
    // Os arquivos auxiliares do conflito (.mine, .rN) não aparecem como novos.
    expect(status.changes.map((change) => `${change.path}:${change.kind}`)).toEqual(['a.txt:conflicted']);

    expect((await updateWorkingCopy(mine)).errorCode).toBe('HAS_CONFLICTS');
  });

  it('mostra os trechos em conflito e resolve pela escolha da pessoa', async () => {
    expect(await readConflictHunks(mine, 'a.txt')).toEqual([{ mine: ['minha versão'], theirs: ['versão da outra pessoa'] }]);

    const blocked = await resolveConflict({ checkoutPath: mine, path: 'a.txt', choice: 'edited' });
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain('marcas de conflito');

    expect((await resolveConflict({ checkoutPath: mine, path: 'a.txt', choice: 'theirs' })).ok).toBe(true);
    expect(readFileSync(path.join(mine, 'a.txt'), 'utf8')).toBe('versão da outra pessoa\n');
    expect((await readWorkingCopyStatus(mine)).conflicts).toBe(0);

    // Novo conflito, resolvido editando o arquivo à mão.
    writeFileSync(path.join(other, 'a.txt'), 'servidor de novo\n');
    svn(['update', '--quiet'], other);
    writeFileSync(path.join(other, 'a.txt'), 'servidor de novo\n');
    svn(['commit', '--quiet', '-m', 'Outra pessoa de novo'], other);
    writeFileSync(path.join(mine, 'a.txt'), 'local de novo\n');
    expect((await updateWorkingCopy(mine)).conflicts).toEqual(['a.txt']);

    writeFileSync(path.join(mine, 'a.txt'), 'combinado à mão\n');
    expect((await resolveConflict({ checkoutPath: mine, path: 'a.txt', choice: 'edited' })).ok).toBe(true);
    expect(readFileSync(path.join(mine, 'a.txt'), 'utf8')).toBe('combinado à mão\n');
    expect((await resolveConflict({ checkoutPath: mine, path: 'a.txt', choice: 'mine' })).ok).toBe(false);
    expect((await resolveConflict({ checkoutPath: mine, path: '../fora', choice: 'mine' })).ok).toBe(false);
  });
});
