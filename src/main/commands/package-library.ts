import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import type { PackageHistoryEntry, PackageHistoryEventKind } from './package-history.js';
import type { SvnflowPackageFile } from './package-exporter.js';

export type PackageLibraryKnownStatus = PackageHistoryEventKind | 'unknown';

export interface PackageLibraryItem {
  fileName: string;
  packagePath: string;
  modifiedAt: string;
  sizeBytes: number;
  readable: boolean;
  title?: string;
  packageId?: string;
  formatVersion?: string;
  generatedAt?: string;
  knownStatus: PackageLibraryKnownStatus;
}

export interface MissingPackageReference {
  packagePath: string;
  packageId: string;
  lastKind: PackageHistoryEventKind;
  recordedAt: string;
}

export interface PackageLibraryResult {
  ok: boolean;
  directory: string;
  message: string;
  items: PackageLibraryItem[];
  missingReferences: MissingPackageReference[];
}

export interface ListPackageLibraryInput {
  directory: string;
  historyEntries?: PackageHistoryEntry[];
}

function readTitleFromMarkdown(markdown: unknown): string | undefined {
  if (typeof markdown !== 'string') {
    return undefined;
  }

  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

async function readPackageHeader(packagePath: string): Promise<Pick<PackageLibraryItem, 'readable' | 'title' | 'packageId' | 'formatVersion' | 'generatedAt'>> {
  try {
    const parsed = JSON.parse(await readFile(packagePath, 'utf8')) as Partial<SvnflowPackageFile>;

    return {
      readable: Boolean(parsed.manifest?.packageId),
      title: parsed.artifacts?.['mini-pr.json']?.title || readTitleFromMarkdown(parsed.artifacts?.['pr.md']),
      packageId: parsed.manifest?.packageId,
      formatVersion: parsed.manifest?.formatVersion,
      generatedAt: parsed.manifest?.generatedAt
    };
  } catch {
    return { readable: false };
  }
}

// O histórico é mantido do mais recente para o mais antigo; o primeiro evento
// de cada caminho representa o último estado conhecido do pacote.
function indexLatestHistoryByPath(entries: PackageHistoryEntry[]): Map<string, PackageHistoryEntry> {
  const latest = new Map<string, PackageHistoryEntry>();

  for (const entry of entries) {
    if (entry.packagePath && !latest.has(entry.packagePath)) {
      latest.set(entry.packagePath, entry);
    }
  }

  return latest;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listPackageLibrary(input: ListPackageLibraryInput): Promise<PackageLibraryResult> {
  const directory = input.directory.trim();
  const latestByPath = indexLatestHistoryByPath(input.historyEntries ?? []);
  const missingReferences: MissingPackageReference[] = [];

  for (const [packagePath, entry] of latestByPath) {
    if (!(await fileExists(packagePath))) {
      missingReferences.push({
        packagePath,
        packageId: entry.packageId,
        lastKind: entry.kind,
        recordedAt: entry.recordedAt
      });
    }
  }

  let fileNames: string[];

  try {
    fileNames = (await readdir(directory)).filter((fileName) => fileName.endsWith('.svnflow'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        ok: true,
        directory,
        message: 'Pasta de pacotes ainda não existe. Ela será criada na primeira exportação.',
        items: [],
        missingReferences
      };
    }

    return {
      ok: false,
      directory,
      message: `Pasta de pacotes não encontrada ou sem permissão de leitura: ${directory}`,
      items: [],
      missingReferences
    };
  }

  const items: PackageLibraryItem[] = [];

  for (const fileName of fileNames) {
    const packagePath = path.join(directory, fileName);

    try {
      const info = await stat(packagePath);

      if (!info.isFile()) {
        continue;
      }

      const header = await readPackageHeader(packagePath);

      items.push({
        fileName,
        packagePath,
        modifiedAt: info.mtime.toISOString(),
        sizeBytes: info.size,
        ...header,
        knownStatus: latestByPath.get(packagePath)?.kind ?? 'unknown'
      });
    } catch {
      // Arquivo removido entre a listagem e a leitura: ignora.
    }
  }

  items.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

  return {
    ok: true,
    directory,
    message: items.length > 0
      ? `${items.length} pacote(s) encontrado(s) na pasta.`
      : 'Nenhum pacote .svnflow encontrado na pasta.',
    items,
    missingReferences
  };
}
