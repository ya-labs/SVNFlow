import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { resolveSvnflowPackagesDirectory } from './package-exporter.js';

export interface AppSettings {
  packagesDirectory: string;
}

interface AppSettingsFile {
  version: 1;
  packagesDirectory?: string;
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
    packagesDirectory: resolveSvnflowPackagesDirectory(baseDirectory)
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

    return { packagesDirectory };
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
    packagesDirectory: changes.packagesDirectory?.trim() || current.packagesDirectory
  };
  const file: AppSettingsFile = { version: 1, packagesDirectory: next.packagesDirectory };

  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(`${storagePath}.tmp`, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  await rename(`${storagePath}.tmp`, storagePath);

  return next;
}
