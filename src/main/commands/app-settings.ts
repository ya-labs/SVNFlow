import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { resolveSvnflowPackagesDirectory } from './package-exporter.js';

export type AppTheme = 'system' | 'light' | 'dark';

// URL base de um servidor SVN informada pela pessoa. Fica só neste arquivo local.
export interface RepositoryRoot {
  name: string;
  url: string;
}

export interface AppSettings {
  packagesDirectory: string;
  theme: AppTheme;
  repositoryRoots: RepositoryRoot[];
  // Pasta onde os checkouts são sugeridos (cada projeto vira uma subpasta).
  checkoutDirectory: string;
}

interface AppSettingsFile {
  version: 1;
  packagesDirectory?: string;
  theme?: AppTheme;
  repositoryRoots?: RepositoryRoot[];
  checkoutDirectory?: string;
}

export function resolveDefaultCheckoutDirectory(baseDirectory: string = os.homedir()): string {
  return path.join(baseDirectory, 'svn');
}

function sanitizeDirectory(value: unknown): string | undefined {
  return typeof value === 'string' && path.isAbsolute(value.trim()) ? path.normalize(value.trim()).replace(/(.)\/+$/, '$1') : undefined;
}

const THEMES: AppTheme[] = ['system', 'light', 'dark'];
const SVN_URL_PATTERN = /^(svn|svn\+ssh|https?|file):\/\/\S+$/i;

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && (THEMES as string[]).includes(value);
}

export function normalizeSvnUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function isSvnUrl(url: string): boolean {
  return SVN_URL_PATTERN.test(url.trim());
}

function sanitizeRoots(value: unknown): RepositoryRoot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<RepositoryRoot>;
    const url = typeof candidate.url === 'string' ? normalizeSvnUrl(candidate.url) : '';

    if (!isSvnUrl(url) || seen.has(url)) {
      return [];
    }

    seen.add(url);
    const name = typeof candidate.name === 'string' && candidate.name.trim()
      ? candidate.name.trim()
      : url.slice(url.lastIndexOf('/') + 1) || url;

    return [{ name, url }];
  });
}

export interface AppSettingsOptions {
  storagePath?: string;
  baseDirectory?: string;
}

export function resolveAppSettingsPath(baseDirectory: string = os.homedir()): string {
  return path.join(baseDirectory, '.svnflow', 'settings.json');
}

function defaultSettings(baseDirectory?: string): AppSettings {
  return {
    packagesDirectory: resolveSvnflowPackagesDirectory(baseDirectory),
    theme: 'system',
    repositoryRoots: [],
    checkoutDirectory: resolveDefaultCheckoutDirectory(baseDirectory)
  };
}

export async function readAppSettings(options: AppSettingsOptions = {}): Promise<AppSettings> {
  const storagePath = options.storagePath ?? resolveAppSettingsPath(options.baseDirectory);
  const defaults = defaultSettings(options.baseDirectory);

  try {
    const parsed = JSON.parse(await readFile(storagePath, 'utf8')) as Partial<AppSettingsFile>;
    const packagesDirectory = typeof parsed.packagesDirectory === 'string' && parsed.packagesDirectory.trim()
      ? parsed.packagesDirectory.trim()
      : defaults.packagesDirectory;

    return {
      packagesDirectory,
      theme: isAppTheme(parsed.theme) ? parsed.theme : defaults.theme,
      repositoryRoots: sanitizeRoots(parsed.repositoryRoots),
      checkoutDirectory: sanitizeDirectory(parsed.checkoutDirectory) ?? defaults.checkoutDirectory
    };
  } catch {
    return defaults;
  }
}

export async function updateAppSettings(
  changes: Partial<AppSettings>,
  options: AppSettingsOptions = {}
): Promise<AppSettings> {
  const storagePath = options.storagePath ?? resolveAppSettingsPath(options.baseDirectory);
  const current = await readAppSettings(options);
  const next: AppSettings = {
    packagesDirectory: changes.packagesDirectory?.trim() || current.packagesDirectory,
    theme: isAppTheme(changes.theme) ? changes.theme : current.theme,
    repositoryRoots: changes.repositoryRoots ? sanitizeRoots(changes.repositoryRoots) : current.repositoryRoots,
    checkoutDirectory: sanitizeDirectory(changes.checkoutDirectory) ?? current.checkoutDirectory
  };
  const file: AppSettingsFile = {
    version: 1,
    packagesDirectory: next.packagesDirectory,
    theme: next.theme,
    repositoryRoots: next.repositoryRoots,
    checkoutDirectory: next.checkoutDirectory
  };

  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(`${storagePath}.tmp`, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  await rename(`${storagePath}.tmp`, storagePath);

  return next;
}
