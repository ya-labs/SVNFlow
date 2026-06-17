import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface ExportPreviewEnvironment {
  environmentName: string;
  gitWorkspacePath: string;
  svnCheckoutPath: string;
  svnCheckoutRoot?: string;
}

export interface ExportPreviewWorkspaceFile {
  path: string;
  previousPath?: string;
  status: string;
  description: string;
  rawStatus: string;
}

export interface ExportPreviewWorkspace {
  branch?: string;
  baseBranch: string;
  totalAffectedFiles: number;
  files: ExportPreviewWorkspaceFile[];
}

export interface ExportPreviewSnapshot {
  environment: ExportPreviewEnvironment;
  workspace: ExportPreviewWorkspace;
  blockers: Array<{ code: string; message: string; affectedFiles?: string[] }>;
  alerts: Array<{ code: string; message: string; severity: 'info' | 'warning'; affectedFiles?: string[] }>;
}

export interface SvnflowManifest {
  formatVersion: '1.0.0';
  packageId: string;
  generatedAt: string;
  checksumAlgorithm: 'sha256';
  checksum: string;
  requiredFields: string[];
  artifacts: {
    previewJson: 'preview.json';
    prMarkdown: 'pr.md';
  };
}

export interface SvnflowPackageFile {
  manifest: SvnflowManifest;
  artifacts: {
    'preview.json': ExportPreviewSnapshot;
    'pr.md': string;
  };
}

export interface ExportPackageInput {
  preview: ExportPreviewSnapshot;
  outputDirectory?: string;
  now?: string;
}

export interface ExportPackageResult {
  ok: boolean;
  message: string;
  packagePath?: string;
  manifest?: SvnflowManifest;
  errorCode?: 'INVALID_PREVIEW' | 'WRITE_FAILED';
}

function sanitizeFileName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'pacote';
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  const serialized = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`);
  return `{${serialized.join(',')}}`;
}

function buildPrMarkdown(preview: ExportPreviewSnapshot, generatedAt: string): string {
  const lines = preview.workspace.files.map(
    (file) => `- **${file.status}** ${file.path}${file.previousPath ? ` (antes: ${file.previousPath})` : ''}`
  );

  return [
    '# Revisao de Pacote SVNFlow',
    '',
    `- Ambiente: ${preview.environment.environmentName}`,
    `- Branch: ${preview.workspace.branch ?? 'nao identificado'}`,
    `- Base: ${preview.workspace.baseBranch}`,
    `- Arquivos afetados: ${preview.workspace.totalAffectedFiles}`,
    `- Gerado em: ${generatedAt}`,
    '',
    '## O que mudou',
    ...lines
  ].join('\n');
}

export function resolveSvnflowPackagesDirectory(baseDirectory: string = os.homedir()): string {
  return path.join(baseDirectory, '.svnflow', 'packages');
}

export async function exportSvnflowPackage(input: ExportPackageInput): Promise<ExportPackageResult> {
  const generatedAt = input.now ?? new Date().toISOString();
  const outputDirectory = input.outputDirectory ?? resolveSvnflowPackagesDirectory();

  if (!input.preview.environment || !input.preview.workspace || input.preview.workspace.files.length === 0) {
    return {
      ok: false,
      message: 'Preview invalido para exportacao de pacote .svnflow.',
      errorCode: 'INVALID_PREVIEW'
    };
  }

  const packageId = randomUUID();
  const prMarkdown = buildPrMarkdown(input.preview, generatedAt);
  const artifacts = {
    'preview.json': input.preview,
    'pr.md': prMarkdown
  };

  const checksum = createHash('sha256')
    .update(stableStringify(artifacts), 'utf8')
    .digest('hex');

  const manifest: SvnflowManifest = {
    formatVersion: '1.0.0',
    packageId,
    generatedAt,
    checksumAlgorithm: 'sha256',
    checksum,
    requiredFields: [
      'manifest.formatVersion',
      'manifest.packageId',
      'manifest.generatedAt',
      'manifest.checksum',
      'artifacts.preview.json',
      'artifacts.pr.md'
    ],
    artifacts: {
      previewJson: 'preview.json',
      prMarkdown: 'pr.md'
    }
  };

  const packageFile: SvnflowPackageFile = {
    manifest,
    artifacts
  };

  const fileName = `${generatedAt.slice(0, 19).replace(/[:T]/g, '-')}-${sanitizeFileName(input.preview.environment.environmentName)}.svnflow`;
  const packagePath = path.join(outputDirectory, fileName);

  try {
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(packagePath, JSON.stringify(packageFile, null, 2), 'utf8');

    return {
      ok: true,
      message: 'Pacote .svnflow exportado com sucesso.',
      packagePath,
      manifest
    };
  } catch (error) {
    return {
      ok: false,
      message: `Falha ao salvar pacote .svnflow: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      errorCode: 'WRITE_FAILED'
    };
  }
}
