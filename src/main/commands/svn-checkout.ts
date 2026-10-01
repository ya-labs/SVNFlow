import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { isSvnUrl, normalizeSvnUrl } from './app-settings.js';
import { svnErrorDetail, type SvnCredentials, type SvnErrorCode } from './svn-client.js';
import { runSvnInSession } from './svn-session.js';
import { count } from './text.js';

export type CheckoutErrorCode = SvnErrorCode | 'INVALID_URL' | 'INVALID_DESTINATION' | 'DESTINATION_NOT_EMPTY' | 'INVALID_REVISION';

export interface CheckoutInput {
  url: string;
  destination: string;
  revision?: string;
  credentials?: SvnCredentials;
  configDir?: string;
  onProgress?: (progress: { files: number; line: string }) => void;
}

export interface CheckoutResult {
  ok: boolean;
  message: string;
  destination: string;
  revision?: string;
  files: number;
  detail?: string;
  errorCode?: CheckoutErrorCode;
}

async function isMissingOrEmpty(directory: string): Promise<boolean | 'not-directory'> {
  try {
    const info = await stat(directory);

    if (!info.isDirectory()) {
      return 'not-directory';
    }

    return (await readdir(directory)).length === 0;
  } catch {
    return true;
  }
}

export async function checkoutProject(input: CheckoutInput): Promise<CheckoutResult> {
  const url = normalizeSvnUrl(input.url);
  const destination = input.destination.trim();
  const revision = input.revision?.trim();
  const base = { destination, files: 0 };

  if (!isSvnUrl(url)) {
    return { ...base, ok: false, message: 'URL SVN inválida.', errorCode: 'INVALID_URL' };
  }

  if (!destination || !path.isAbsolute(destination)) {
    return { ...base, ok: false, message: 'Escolha uma pasta de destino com caminho completo.', errorCode: 'INVALID_DESTINATION' };
  }

  if (revision && !/^(\d+|HEAD)$/i.test(revision)) {
    return { ...base, ok: false, message: 'Revisão inválida. Use um número ou HEAD.', errorCode: 'INVALID_REVISION' };
  }

  const available = await isMissingOrEmpty(destination);

  if (available === 'not-directory') {
    return { ...base, ok: false, message: 'O destino aponta para um arquivo, não para uma pasta.', errorCode: 'INVALID_DESTINATION' };
  }

  if (!available) {
    return { ...base, ok: false, message: 'A pasta de destino já existe e não está vazia. Escolha outra pasta.', errorCode: 'DESTINATION_NOT_EMPTY' };
  }

  let files = 0;
  const args = ['checkout', ...(revision ? ['-r', revision.toUpperCase()] : []), url, destination];
  const result = await runSvnInSession(args, {
    url,
    credentials: input.credentials,
    configDir: input.configDir,
    onLine: (line) => {
      if (/^[AUGE ]{1,4}\s+\S/.test(line) && !/^Checked out/.test(line)) {
        files += 1;
        input.onProgress?.({ files, line: line.replace(/^[AUGE ]{1,4}\s+/, '') });
      }
    }
  });

  if (!result.ok) {
    return { ...base, files, ok: false, message: result.message, detail: svnErrorDetail(result.stderr), errorCode: result.errorCode };
  }

  const checkedOut = result.stdout.match(/Checked out revision (\d+)\./)?.[1];

  return {
    ...base,
    ok: true,
    files,
    revision: checkedOut,
    message: `Checkout concluído${checkedOut ? ` na revisão ${checkedOut}` : ''}: ${count(files, 'arquivo', 'arquivos')}.`
  };
}
