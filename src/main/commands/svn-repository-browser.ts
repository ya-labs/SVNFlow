import { normalizeSvnUrl } from './app-settings.js';
import { svnErrorDetail, type SvnCredentials, type SvnErrorCode } from './svn-client.js';
import { runSvnInSession } from './svn-session.js';
import { parseListXml } from './svn-xml.js';
import { count } from './text.js';

export interface RemoteEntry {
  name: string;
  kind: 'dir' | 'file';
  url: string;
  revision?: string;
  author?: string;
  date?: string;
  size?: number;
}

export interface RemoteLayout {
  trunk: boolean;
  branches: boolean;
  tags: boolean;
}

export interface RemoteListing {
  ok: boolean;
  url: string;
  entries: RemoteEntry[];
  layout: RemoteLayout;
  message: string;
  detail?: string;
  errorCode?: SvnErrorCode;
}

export interface ListRemoteOptions {
  credentials?: SvnCredentials;
  configDir?: string;
}

export function joinSvnUrl(base: string, name: string): string {
  return `${normalizeSvnUrl(base)}/${name.replace(/^\/+|\/+$/g, '')}`;
}

export function suggestProjectName(url: string): string {
  const segments = normalizeSvnUrl(url).split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? 'projeto';

  // Checkout de trunk recebe o nome do projeto, não "trunk".
  if (last === 'trunk' && segments.length > 1) {
    return segments[segments.length - 2];
  }

  return decodeURIComponent(last);
}

export async function listRemote(url: string, options: ListRemoteOptions = {}): Promise<RemoteListing> {
  const target = normalizeSvnUrl(url);
  const empty = { url: target, entries: [], layout: { trunk: false, branches: false, tags: false } };
  const result = await runSvnInSession(['list', '--xml', target], {
    url: target,
    credentials: options.credentials,
    configDir: options.configDir,
    timeoutMs: 60000,
    cancelable: true
  });

  if (!result.ok) {
    return { ...empty, ok: false, message: result.message, detail: svnErrorDetail(result.stderr), errorCode: result.errorCode };
  }

  const entries = parseListXml(result.stdout)
    .map((entry) => ({
      name: entry.name,
      kind: entry.kind,
      url: joinSvnUrl(target, entry.name),
      revision: entry.revision,
      author: entry.author,
      date: entry.date,
      size: entry.size
    }))
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1));
  const directories = new Set(entries.filter((entry) => entry.kind === 'dir').map((entry) => entry.name));

  return {
    ok: true,
    url: target,
    entries,
    layout: { trunk: directories.has('trunk'), branches: directories.has('branches'), tags: directories.has('tags') },
    message: `${count(entries.length, 'item', 'itens')} em ${target}.`
  };
}
