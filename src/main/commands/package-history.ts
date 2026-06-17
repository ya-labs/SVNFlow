import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export type PackageHistoryEventKind = 'exported' | 'imported' | 'invalid';

export interface PackageHistoryEntry {
  id: string;
  kind: PackageHistoryEventKind;
  packageId: string;
  packagePath: string;
  environmentName: string;
  baseBranch: string;
  totalAffectedFiles: number;
  generatedAt: string;
  recordedAt: string;
}

export interface PackageHistoryFile {
  version: 1;
  updatedAt: string;
  entries: PackageHistoryEntry[];
}

export interface AppendPackageHistoryInput {
  entry: Omit<PackageHistoryEntry, 'id' | 'recordedAt'>;
  storagePath?: string;
  now?: string;
}

export interface ReadPackageHistoryInput {
  storagePath?: string;
}

export interface PackageHistoryResult {
  ok: boolean;
  entries: PackageHistoryEntry[];
  storagePath: string;
  message: string;
}

const HISTORY_FILE_NAME = 'package-history.json';
const HISTORY_DIRECTORY_NAME = '.svnflow';

export function resolvePackageHistoryPath(baseDirectory: string = os.homedir()): string {
  return path.join(baseDirectory, HISTORY_DIRECTORY_NAME, HISTORY_FILE_NAME);
}

function isPackageHistoryFile(value: unknown): value is PackageHistoryFile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return obj.version === 1 && Array.isArray(obj.entries);
}

async function readHistory(storagePath: string): Promise<PackageHistoryFile> {
  try {
    const raw = await readFile(storagePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (isPackageHistoryFile(parsed)) {
      return parsed;
    }

    return { version: 1, updatedAt: new Date().toISOString(), entries: [] };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), entries: [] };
  }
}

export async function readPackageHistory(input: ReadPackageHistoryInput = {}): Promise<PackageHistoryResult> {
  const storagePath = input.storagePath ?? resolvePackageHistoryPath();

  const history = await readHistory(storagePath);

  return {
    ok: true,
    entries: history.entries,
    storagePath,
    message: history.entries.length > 0
      ? `${history.entries.length} registro(s) no historico de pacotes.`
      : 'Historico de pacotes vazio.'
  };
}

export async function appendPackageHistory(input: AppendPackageHistoryInput): Promise<PackageHistoryResult> {
  const storagePath = input.storagePath ?? resolvePackageHistoryPath();
  const now = input.now ?? new Date().toISOString();

  const history = await readHistory(storagePath);

  const newEntry: PackageHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: now,
    ...input.entry
  };

  history.entries.unshift(newEntry);
  history.updatedAt = now;

  try {
    await mkdir(path.dirname(storagePath), { recursive: true });
    await writeFile(storagePath, JSON.stringify(history, null, 2), 'utf8');

    return {
      ok: true,
      entries: history.entries,
      storagePath,
      message: 'Registro adicionado ao historico de pacotes.'
    };
  } catch (error) {
    return {
      ok: false,
      entries: [],
      storagePath,
      message: `Falha ao salvar historico: ${error instanceof Error ? error.message : 'erro desconhecido'}`
    };
  }
}
