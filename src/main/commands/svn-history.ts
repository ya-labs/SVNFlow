import { normalizeSvnUrl } from './app-settings.js';
import { toDiffResult, type SyncFileDiff } from './git-svn-sync.js';
import { svnErrorDetail, type SvnCredentials, type SvnErrorCode } from './svn-client.js';
import { runSvnInSession } from './svn-session.js';
import { parseInfoXml, parseLogXml, type SvnXmlLogEntry } from './svn-xml.js';
import { count } from './text.js';

export interface SvnLogPage {
  ok: boolean;
  message: string;
  url?: string;
  repositoryRoot?: string;
  // Caminho do projeto dentro do repositório (ex.: /projeto/trunk), para encurtar os caminhos do log.
  projectPath?: string;
  workingCopyRevision?: string;
  entries: SvnXmlLogEntry[];
  hasMore: boolean;
  detail?: string;
  errorCode?: SvnErrorCode | 'INVALID_REVISION';
}

export interface ReadLogInput {
  // URL do projeto; ou pasta do checkout, cuja URL é lida com svn info.
  url?: string;
  checkoutPath?: string;
  limit?: number;
  before?: string;
  credentials?: SvnCredentials;
  configDir?: string;
}

export interface RevisionDiffInput {
  repositoryRoot: string;
  revision: string;
  path: string;
  credentials?: SvnCredentials;
  configDir?: string;
}

const DEFAULT_LIMIT = 50;

export async function readLog(input: ReadLogInput): Promise<SvnLogPage> {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), 500);
  const empty = { entries: [], hasMore: false };

  if (input.before !== undefined && !/^\d+$/.test(input.before)) {
    return { ...empty, ok: false, message: 'Revisão inválida.', errorCode: 'INVALID_REVISION' };
  }

  // O log é pedido pela URL: na pasta do checkout ele pararia na revisão
  // baixada e esconderia os commits novos do servidor.
  const infoTarget = input.url ? normalizeSvnUrl(input.url) : '.';
  const info = await runSvnInSession(['info', '--xml', infoTarget], {
    cwd: input.url ? undefined : input.checkoutPath,
    url: input.url,
    credentials: input.credentials,
    configDir: input.configDir
  });

  if (!info.ok) {
    return { ...empty, ok: false, message: info.message, detail: svnErrorDetail(info.stderr), errorCode: info.errorCode };
  }

  const parsedInfo = parseInfoXml(info.stdout);
  const url = parsedInfo.url ?? input.url;

  if (!url) {
    return { ...empty, ok: false, message: 'Não foi possível descobrir a URL do projeto.' };
  }

  const before = input.before !== undefined ? Number(input.before) : undefined;

  if (before !== undefined && before < 1) {
    return { ...empty, ok: true, url, repositoryRoot: parsedInfo.repositoryRoot, message: 'Fim do histórico.' };
  }

  const range = before !== undefined ? `${before}:1` : 'HEAD:1';
  const log = await runSvnInSession(['log', '--xml', '-v', '-l', String(limit + 1), '-r', range, url], {
    url,
    credentials: input.credentials,
    configDir: input.configDir,
    timeoutMs: 120000
  });

  if (!log.ok) {
    return { ...empty, ok: false, url, message: log.message, detail: svnErrorDetail(log.stderr), errorCode: log.errorCode };
  }

  const entries = parseLogXml(log.stdout);
  const root = parsedInfo.repositoryRoot;
  const projectPath = root && url.startsWith(root) ? decodeURIComponent(url.slice(root.length)) || '/' : undefined;

  return {
    ok: true,
    url,
    repositoryRoot: root,
    projectPath,
    workingCopyRevision: input.url ? undefined : parsedInfo.revision,
    entries: entries.slice(0, limit),
    hasMore: entries.length > limit,
    message: entries.length === 0 ? 'Nenhum commit no histórico.' : `${count(Math.min(entries.length, limit), 'commit carregado', 'commits carregados')}.`
  };
}

export async function readRevisionDiff(input: RevisionDiffInput): Promise<SyncFileDiff> {
  const base = { path: input.path, lines: [] as string[], truncated: false, source: 'svn-revision' as const };

  if (!/^\d+$/.test(input.revision) || !input.path.startsWith('/') || input.path.split('/').includes('..')) {
    return { ...base, kind: 'empty' };
  }

  const target = `${normalizeSvnUrl(input.repositoryRoot)}${input.path}`;
  const diff = await runSvnInSession(['diff', '-c', input.revision, target], {
    url: input.repositoryRoot,
    credentials: input.credentials,
    configDir: input.configDir,
    timeoutMs: 120000
  });

  if (!diff.ok) {
    return { ...base, kind: 'empty' };
  }

  if (/^Cannot display: file marked as a binary type/m.test(diff.stdout)) {
    return { ...base, kind: 'binary' };
  }

  return { ...toDiffResult(input.path, 'svn-revision', diff.stdout) };
}
