import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { buildSvnArgs, classifySvnError, runSvn } from '../svn-client';
import { parseInfoXml } from '../svn-xml';

function hasCommand(command: string): boolean {
  try {
    execFileSync(command, ['--version', '--quiet'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const describeWithSvnserve = hasCommand('svnserve') && hasCommand('svnadmin') ? describe : describe.skip;

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

async function waitForPort(port: number): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const connected = await new Promise<boolean>((resolve) => {
      const socket = net.connect(port, '127.0.0.1', () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
    });

    if (connected) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

describe('svn-client', () => {
  it('nunca coloca a senha nos argumentos', () => {
    const args = buildSvnArgs(['info', 'svn://servidor/projeto'], { username: 'pessoa', password: 'segredo' });

    expect(args).toEqual(['--non-interactive', '--username', 'pessoa', '--password-from-stdin', 'info', 'svn://servidor/projeto']);
    expect(args.join(' ')).not.toContain('segredo');
  });

  it('classifica erros do SVN por código', () => {
    expect(classifySvnError("svn: E170013: Unable to connect\nsvn: E180001: Unable to open repository").code).toBe('NOT_FOUND');
    expect(classifySvnError('svn: E170013: Unable to connect\nsvn: E000111: Connection refused').code).toBe('NETWORK');
    expect(classifySvnError('svn: E170001: Authentication error from server').code).toBe('AUTH_REQUIRED');
    expect(classifySvnError('svn: E155007: is not a working copy').code).toBe('NOT_WORKING_COPY');
    expect(classifySvnError('svn: E155011: File is out of date').code).toBe('OUT_OF_DATE');
  });

  it('informa svn ausente sem lançar erro', async () => {
    const originalPath = process.env.PATH;
    process.env.PATH = '/caminho/inexistente';

    try {
      const result = await runSvn(['--version']);
      expect(result.errorCode).toBe('SVN_UNAVAILABLE');
    } finally {
      process.env.PATH = originalPath;
    }
  });
});

describeWithSvnserve('svn-client com svnserve autenticado', () => {
  let root: string;
  let server: ChildProcess;
  let url: string;
  let configDir: string;

  beforeAll(async () => {
    root = mkdtempSync(path.join(os.tmpdir(), 'svnflow-svnserve-'));
    configDir = path.join(root, 'config');
    const repo = path.join(root, 'repos', 'projeto');
    mkdirSync(path.dirname(repo), { recursive: true });
    execFileSync('svnadmin', ['create', repo]);
    writeFileSync(path.join(repo, 'conf', 'svnserve.conf'), '[general]\nanon-access = none\nauth-access = write\npassword-db = passwd\nrealm = svnflow-teste\n');
    writeFileSync(path.join(repo, 'conf', 'passwd'), '[users]\npessoa = segredo\n');

    const port = await freePort();
    server = spawn('svnserve', ['-d', '--foreground', '--listen-host', '127.0.0.1', '--listen-port', String(port), '-r', path.join(root, 'repos')], { stdio: 'ignore' });
    await waitForPort(port);
    url = `svn://127.0.0.1:${port}/projeto`;
  });

  afterAll(() => {
    server?.kill();
    rmSync(root, { recursive: true, force: true });
  });

  it('pede credenciais, aceita senha por stdin e recusa senha errada', async () => {
    const withoutCredentials = await runSvn(['info', '--xml', url], { configDir });
    expect(withoutCredentials.errorCode).toBe('AUTH_REQUIRED');

    const wrong = await runSvn(['info', '--xml', url], { configDir, credentials: { username: 'pessoa', password: 'errada' } });
    expect(wrong.errorCode).toBe('AUTH_REQUIRED');

    const lines: string[] = [];
    const ok = await runSvn(['info', url], { configDir, credentials: { username: 'pessoa', password: 'segredo' }, onLine: (line) => lines.push(line) });
    expect(ok.ok).toBe(true);
    expect(lines.some((line) => line.startsWith('URL:'))).toBe(true);

    const info = await runSvn(['info', '--xml', url], { configDir, credentials: { username: 'pessoa', password: 'segredo' } });
    expect(parseInfoXml(info.stdout)).toMatchObject({ url, revision: '0', kind: 'dir' });
  });
});
