import { runSvn, type SvnCredentials, type SvnRunOptions, type SvnRunResult } from './svn-client.js';

// Credenciais informadas na interface ficam só na memória do processo, por
// servidor, durante a sessão. Nada é gravado em disco pelo SVNFlow; se o SVN da
// máquina estiver configurado para guardar senhas, ele faz isso no cache dele.
const sessionCredentials = new Map<string, SvnCredentials>();

export function credentialKey(url: string): string {
  const match = url.trim().match(/^([a-z+]+:\/\/[^/]+)/i);
  return (match ? match[1] : url.trim()).toLowerCase();
}

export function rememberCredentials(url: string, credentials: SvnCredentials): void {
  sessionCredentials.set(credentialKey(url), credentials);
}

export function forgetCredentials(url: string): void {
  sessionCredentials.delete(credentialKey(url));
}

export function clearSessionCredentials(): void {
  sessionCredentials.clear();
}

export interface SessionRunOptions extends Omit<SvnRunOptions, 'credentials'> {
  // URL do servidor usada para achar as credenciais da sessão.
  url?: string;
  credentials?: SvnCredentials;
}

export async function runSvnInSession(args: string[], options: SessionRunOptions = {}): Promise<SvnRunResult> {
  const { url, credentials, ...rest } = options;
  const effective = credentials ?? (url ? sessionCredentials.get(credentialKey(url)) : undefined);
  const result = await runSvn(args, { ...rest, credentials: effective });

  if (url && effective) {
    if (result.ok) {
      rememberCredentials(url, effective);
    } else if (result.errorCode === 'AUTH_REQUIRED') {
      forgetCredentials(url);
    }
  }

  return result;
}
