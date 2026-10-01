import { execFileSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { checkoutProject } from '../svn-checkout';
import { listRemote, suggestProjectName } from '../svn-repository-browser';
import { clearSessionCredentials } from '../svn-session';
import { startSvnserve } from './helpers/svnserve';

function hasCommand(command: string): boolean {
  try {
    execFileSync(command, ['--version', '--quiet'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const describeWithSvn = hasCommand('svn') && hasCommand('svnadmin') && hasCommand('svnserve') ? describe : describe.skip;

function svn(args: string[], cwd: string): string {
  return execFileSync('svn', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

describe('suggestProjectName', () => {
  it('usa o nome do projeto quando a URL termina em trunk', () => {
    expect(suggestProjectName('svn://servidor/raiz/app-vendas/trunk')).toBe('app-vendas');
    expect(suggestProjectName('svn://servidor/raiz/app%20estoque/')).toBe('app estoque');
  });
});

describeWithSvn('repositórios e checkout', () => {
  let root: string;
  let reposDir: string;
  let fileUrl: string;
  let server: ChildProcess | undefined;

  beforeAll(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-repos-'));
    reposDir = path.join(root, 'repos');
    mkdirSync(reposDir);
    const repo = path.join(reposDir, 'raiz');
    execFileSync('svnadmin', ['create', repo]);
    fileUrl = `file://${repo}`;

    const seed = path.join(root, 'seed');
    svn(['checkout', '--quiet', fileUrl, seed], root);
    mkdirSync(path.join(seed, 'app-vendas', 'trunk', 'src'), { recursive: true });
    mkdirSync(path.join(seed, 'app-vendas', 'branches'));
    mkdirSync(path.join(seed, 'app-vendas', 'tags'));
    mkdirSync(path.join(seed, 'app estoque'));
    writeFileSync(path.join(seed, 'app-vendas', 'trunk', 'src', 'app.js'), 'v1\n');
    writeFileSync(path.join(seed, 'app estoque', 'leia-me.txt'), 'estoque\n');
    writeFileSync(path.join(seed, 'LEIA-ME.txt'), 'raiz\n');
    svn(['add', '--quiet', 'app-vendas', 'app estoque', 'LEIA-ME.txt'], seed);
    svn(['commit', '--quiet', '-m', 'Estrutura inicial'], seed);
    writeFileSync(path.join(seed, 'app-vendas', 'trunk', 'src', 'app.js'), 'v2\n');
    svn(['commit', '--quiet', '-m', 'Versão 2'], seed);
  });

  afterAll(() => {
    server?.kill();
    clearSessionCredentials();
    rmSync(root, { recursive: true, force: true });
  });

  it('lista projetos com pastas primeiro e detecta trunk/branches/tags', async () => {
    const listing = await listRemote(fileUrl);

    expect(listing.ok).toBe(true);
    expect(listing.entries.map((entry) => `${entry.kind}:${entry.name}`)).toEqual(['dir:app estoque', 'dir:app-vendas', 'file:LEIA-ME.txt']);
    expect(listing.entries[1]).toMatchObject({ url: `${fileUrl}/app-vendas`, revision: '2' });
    expect(listing.layout.trunk).toBe(false);

    const project = await listRemote(`${fileUrl}/app-vendas/`);
    expect(project.layout).toEqual({ trunk: true, branches: true, tags: true });

    const spaced = await listRemote(`${fileUrl}/app estoque`);
    expect(spaced.entries.map((entry) => entry.name)).toEqual(['leia-me.txt']);

    const missing = await listRemote(`${fileUrl}/nao-existe`);
    expect(missing.ok).toBe(false);
    expect(missing.errorCode).toBe('NOT_FOUND');
  });

  it('faz checkout com progresso, respeita -r e protege o destino', async () => {
    const destination = path.join(root, 'checkouts', 'app-vendas');
    const progress: string[] = [];
    const result = await checkoutProject({
      url: `${fileUrl}/app-vendas/trunk`,
      destination,
      onProgress: ({ line }) => progress.push(line)
    });

    expect(result).toMatchObject({ ok: true, revision: '2' });
    expect(progress.some((line) => line.endsWith('app.js'))).toBe(true);
    expect(readFileSync(path.join(destination, 'src', 'app.js'), 'utf8')).toBe('v2\n');

    const occupied = await checkoutProject({ url: `${fileUrl}/app-vendas/trunk`, destination });
    expect(occupied.errorCode).toBe('DESTINATION_NOT_EMPTY');

    const old = await checkoutProject({ url: `${fileUrl}/app-vendas/trunk`, destination: path.join(root, 'checkouts', 'r1'), revision: '1' });
    expect(old).toMatchObject({ ok: true, revision: '1' });
    expect(readFileSync(path.join(root, 'checkouts', 'r1', 'src', 'app.js'), 'utf8')).toBe('v1\n');

    expect((await checkoutProject({ url: fileUrl, destination: path.join(root, 'x'), revision: '1; rm' })).errorCode).toBe('INVALID_REVISION');
    expect((await checkoutProject({ url: 'ftp://servidor/x', destination: path.join(root, 'x') })).errorCode).toBe('INVALID_URL');
    expect((await checkoutProject({ url: fileUrl, destination: 'relativo' })).errorCode).toBe('INVALID_DESTINATION');
    expect(existsSync(path.join(root, 'x'))).toBe(false);
  });

  it('lembra a credencial na sessão depois do primeiro acesso autenticado', async () => {
    const conf = path.join(reposDir, 'raiz', 'conf');
    writeFileSync(path.join(conf, 'svnserve.conf'), '[general]\nanon-access = none\nauth-access = write\npassword-db = passwd\nrealm = svnflow-teste\n');
    writeFileSync(path.join(conf, 'passwd'), '[users]\npessoa = segredo\n');
    const configDir = path.join(root, 'svn-config');
    const running = await startSvnserve(reposDir, 'raiz', configDir);
    server = running.process;

    const url = `svn://127.0.0.1:${running.port}/raiz`;
    expect((await listRemote(url, { configDir })).errorCode).toBe('AUTH_REQUIRED');
    expect((await listRemote(url, { configDir, credentials: { username: 'pessoa', password: 'segredo' } })).ok).toBe(true);
    // Pasta de configuração nova (sem cache do SVN): o acesso só funciona pela credencial da sessão.
    expect((await listRemote(`${url}/app-vendas`, { configDir: path.join(root, 'svn-config-vazio') })).ok).toBe(true);
    clearSessionCredentials();
    expect((await listRemote(`${url}/app-vendas`, { configDir: path.join(root, 'svn-config-vazio-2') })).errorCode).toBe('AUTH_REQUIRED');
  });
});
