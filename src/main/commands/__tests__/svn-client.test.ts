import { execFileSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildSvnArgs, cancelSvnOperations, classifySvnError, runSvn } from '../svn-client';
import { startSvnserve } from './helpers/svnserve';
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

  it('distingue peg revision inválida de caminho não encontrado', () => {
    const result = classifySvnError("svn: E200009: 'icon-20@2x.png': a peg revision is not allowed here");
    expect(result.code).toBe('FAILED');
    expect(result.message).toContain('nomes com @');
    expect(classifySvnError('svn: E200009: Could not display info for all targets').code).toBe('NOT_FOUND');
    expect(classifySvnError("svn: E155010: The node was not found").code).toBe('NOT_FOUND');
  });

  it('não quebra quando o svn termina sem ler a entrada (EPIPE)', async () => {
    // svn falso que sai na hora, sem ler a entrada: a escrita de 1 MB encontra o pipe fechado.
    const fakeBin = mkdtempSync(path.join(os.tmpdir(), 'svnflow-fake-svn-'));
    writeFileSync(path.join(fakeBin, 'svn'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    const originalPath = process.env.PATH;
    process.env.PATH = `${fakeBin}${path.delimiter}${originalPath}`;

    try {
      const result = await runSvn(['info'], { credentials: { username: 'pessoa', password: 'x'.repeat(1024 * 1024) } });
      expect(result.ok).toBe(true);
    } finally {
      process.env.PATH = originalPath;
      rmSync(fakeBin, { recursive: true, force: true });
    }
  });

  it('avisa que a pasta do projeto sumiu em vez de dizer que o svn não está instalado', async () => {
    const result = await runSvn(['status'], { cwd: path.join(os.tmpdir(), 'svnflow-pasta-que-nao-existe') });
    expect(result.errorCode).toBe('MISSING_FOLDER');
    expect(result.message).toContain('não existe mais');
  });

  it('cancela só as operações marcadas como canceláveis', async () => {
    const fakeBin = mkdtempSync(path.join(os.tmpdir(), 'svnflow-fake-svn-'));
    writeFileSync(path.join(fakeBin, 'svn'), '#!/bin/sh\nexec sleep 30\n', { mode: 0o755 });
    const originalPath = process.env.PATH;
    process.env.PATH = `${fakeBin}${path.delimiter}${originalPath}`;

    try {
      const cancelable = runSvn(['list', 'svn://servidor/caminho'], { cancelable: true });
      const protectedRun = runSvn(['commit'], { timeoutMs: 1500 });
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(cancelSvnOperations()).toBe(1);
      expect(await cancelable).toMatchObject({ ok: false, errorCode: 'CANCELLED' });
      expect((await protectedRun).errorCode).toBe('TIMEOUT');
    } finally {
      process.env.PATH = originalPath;
      rmSync(fakeBin, { recursive: true, force: true });
    }
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

    const running = await startSvnserve(path.join(root, 'repos'), 'projeto', configDir);
    server = running.process;
    const port = running.port;
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
