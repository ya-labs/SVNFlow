import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';

export interface SvnCredentials {
  username: string;
  password: string;
}

export type SvnErrorCode =
  | 'AUTH_REQUIRED'
  | 'NOT_FOUND'
  | 'NOT_WORKING_COPY'
  | 'CONFLICT'
  | 'OUT_OF_DATE'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'SVN_UNAVAILABLE'
  | 'MISSING_FOLDER'
  | 'CANCELLED'
  | 'FAILED';

export interface SvnRunOptions {
  cwd?: string;
  credentials?: SvnCredentials;
  // Pasta de configuração do SVN alternativa (usada em testes para não tocar no cache real).
  configDir?: string;
  timeoutMs?: number;
  onLine?: (line: string) => void;
  // Operação que a pessoa pode interromper pelo botão "Cancelar" do aviso de carregamento.
  cancelable?: boolean;
}

export interface SvnRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  errorCode?: SvnErrorCode;
  message: string;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

// Mensagens do SVN em inglês (códigos e textos estáveis para classificar erros),
// mantendo a codificação do sistema para nomes de arquivo com acento.
function svnEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, LC_MESSAGES: 'C', LANGUAGE: '' };

  if (env.LC_ALL) {
    env.LC_CTYPE = env.LC_ALL;
    delete env.LC_ALL;
  }

  return env;
}

const ERROR_PATTERNS: Array<{ code: SvnErrorCode; pattern: RegExp; message: string }> = [
  { code: 'FAILED', pattern: /a peg revision is not allowed here|syntax error parsing peg revision|invalid peg revision/i, message: 'O SVN interpretou parte do caminho como revisão. Verifique o tratamento de nomes com @.' },
  { code: 'AUTH_REQUIRED', pattern: /E170001|E215004|E170013.*authoriz|Authentication failed|authorization failed/i, message: 'O servidor SVN pediu usuário e senha.' },
  { code: 'NOT_FOUND', pattern: /E180001|E160013|E170000|E200009|E155010|doesn't exist|not found/i, message: 'Caminho ou repositório SVN não encontrado.' },
  { code: 'NOT_WORKING_COPY', pattern: /E155007/, message: 'A pasta não é um checkout SVN.' },
  { code: 'CONFLICT', pattern: /E155015|E155035|remains in conflict|conflict/i, message: 'Há conflitos no checkout SVN. Resolva antes de continuar.' },
  { code: 'OUT_OF_DATE', pattern: /E155011|E160028|E170004|out of date|out-of-date/i, message: 'O checkout está desatualizado em relação ao servidor. Atualize antes de commitar.' },
  { code: 'NETWORK', pattern: /E170013|E000111|E670002|E670008|E210002|E000110|Unable to connect|Connection refused|timed out/i, message: 'Não foi possível conectar ao servidor SVN.' }
];

export function classifySvnError(stderr: string): { code: SvnErrorCode; message: string } {
  for (const candidate of ERROR_PATTERNS) {
    if (candidate.pattern.test(stderr)) {
      return { code: candidate.code, message: candidate.message };
    }
  }

  return { code: 'FAILED', message: 'O comando SVN falhou.' };
}

export function buildSvnArgs(args: string[], credentials?: SvnCredentials, configDir?: string): string[] {
  const authentication = credentials ? ['--username', credentials.username, '--password-from-stdin'] : [];
  const config = configDir ? ['--config-dir', configDir] : [];
  return ['--non-interactive', ...config, ...authentication, ...args];
}

// Processos em andamento que podem ser cancelados pela interface.
const cancelableChildren = new Set<ChildProcess>();
const cancelledChildren = new WeakSet<ChildProcess>();

// Interrompe as operações canceláveis em andamento. Devolve quantas foram interrompidas.
export function cancelSvnOperations(): number {
  const running = [...cancelableChildren];
  running.forEach((child) => {
    cancelledChildren.add(child);
    child.kill('SIGTERM');
  });
  return running.length;
}

export function runSvn(args: string[], options: SvnRunOptions = {}): Promise<SvnRunResult> {
  // Sem a pasta, o spawn falha com ENOENT, que seria lido como "svn não instalado".
  if (options.cwd && !existsSync(options.cwd)) {
    return Promise.resolve({
      ok: false,
      stdout: '',
      stderr: '',
      exitCode: null,
      errorCode: 'MISSING_FOLDER',
      message: 'A pasta do projeto não existe mais neste computador.'
    });
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let pending = '';
    let settled = false;

    const finish = (result: SvnRunResult) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cancelableChildren.delete(child);
        resolve(cancelledChildren.has(child) ? { ...result, ok: false, errorCode: 'CANCELLED', message: 'Operação cancelada.' } : result);
      }
    };

    const child = spawn('svn', buildSvnArgs(args, options.credentials, options.configDir), {
      cwd: options.cwd,
      env: svnEnvironment(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (options.cancelable) {
      cancelableChildren.add(child);
    }

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish({ ok: false, stdout, stderr, exitCode: null, errorCode: 'TIMEOUT', message: 'O comando SVN demorou demais e foi interrompido.' });
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    child.stdout.setEncoding('utf-8');
    child.stderr.setEncoding('utf-8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;

      if (options.onLine) {
        pending += chunk;
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        lines.filter((line) => line.trim()).forEach((line) => options.onLine!(line));
      }
    });

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      finish({
        ok: false,
        stdout,
        stderr: error.message,
        exitCode: null,
        errorCode: error.code === 'ENOENT' ? 'SVN_UNAVAILABLE' : 'FAILED',
        message: error.code === 'ENOENT' ? 'Cliente svn não encontrado. Instale o Subversion.' : `Falha ao executar svn: ${error.message}`
      });
    });

    child.on('close', (exitCode) => {
      if (pending.trim() && options.onLine) {
        options.onLine(pending);
      }

      if (exitCode === 0) {
        finish({ ok: true, stdout, stderr, exitCode, message: 'OK' });
        return;
      }

      const classified = classifySvnError(stderr);
      finish({ ok: false, stdout, stderr, exitCode, errorCode: classified.code, message: classified.message });
    });

    // O svn pode terminar antes de ler a entrada; nesse caso a escrita dá EPIPE,
    // que sem tratamento derrubaria o processo principal.
    child.stdin.on('error', () => undefined);
    child.stdin.end(options.credentials ? `${options.credentials.password}\n` : '');
  });
}

// Primeira linha "svn: E…" útil para mostrar junto da mensagem traduzida.
export function svnErrorDetail(stderr: string): string {
  return stderr
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^svn: E\d+/.test(line))
    .slice(-1)[0] ?? stderr.trim().split('\n')[0] ?? '';
}
