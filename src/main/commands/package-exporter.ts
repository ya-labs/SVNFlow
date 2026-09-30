import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildMiniPrMarkdown, normalizeMiniPrDraft, validateMiniPrDraft, type MiniPrDraft } from './mini-pr.js';

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

export type SvnflowFormatVersion = '1.0.0' | '1.1.0';

export const CURRENT_SVNFLOW_FORMAT_VERSION: SvnflowFormatVersion = '1.1.0';

export interface SvnflowManifest {
  formatVersion: SvnflowFormatVersion;
  packageId: string;
  generatedAt: string;
  checksumAlgorithm: 'sha256';
  checksum: string;
  requiredFields: string[];
  author?: string;
  artifacts: {
    previewJson: 'preview.json';
    prMarkdown: 'pr.md';
    patchDiff?: 'patch.diff';
    miniPrJson?: 'mini-pr.json';
  };
}

export interface SvnflowPackageArtifacts {
  'preview.json': ExportPreviewSnapshot;
  'pr.md': string;
  'patch.diff'?: string;
  'mini-pr.json'?: MiniPrDraft;
}

export interface SvnflowPackageFile {
  manifest: SvnflowManifest;
  artifacts: SvnflowPackageArtifacts;
}

export interface ExportPackageInput {
  preview: ExportPreviewSnapshot;
  miniPr?: Partial<MiniPrDraft>;
  patchContent: string;
  author?: string;
  outputDirectory?: string;
  now?: string;
}

export type ExportPackageErrorCode = 'INVALID_PREVIEW' | 'INVALID_MINI_PR' | 'INVALID_PATCH' | 'WRITE_FAILED';

export interface ExportPackageResult {
  ok: boolean;
  message: string;
  packagePath?: string;
  manifest?: SvnflowManifest;
  errorCode?: ExportPackageErrorCode;
  pendingRequiredFields?: string[];
}

function sanitizeFileName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'pacote';
}


export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).filter((key) => objectValue[key] !== undefined).sort();
  const serialized = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`);
  return `{${serialized.join(',')}}`;
}

export function calculateArtifactsChecksum(artifacts: unknown): string {
  return createHash('sha256')
    .update(stableStringify(artifacts), 'utf8')
    .digest('hex');
}

export function buildSuggestedPackageFileName(title: string, generatedAt: string): string {
  return `${generatedAt.slice(0, 19).replace(/[:T]/g, '-')}-${sanitizeFileName(title).slice(0, 60)}.svnflow`;
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

  if (input.preview.blockers.length > 0) {
    return {
      ok: false,
      message: `Preview com bloqueios: ${input.preview.blockers[0].message}`,
      errorCode: 'INVALID_PREVIEW'
    };
  }

  const miniPr = normalizeMiniPrDraft(input.miniPr);
  const miniPrValidation = validateMiniPrDraft(miniPr);

  if (!miniPrValidation.isValid) {
    return {
      ok: false,
      message: miniPrValidation.message,
      errorCode: 'INVALID_MINI_PR',
      pendingRequiredFields: miniPrValidation.pendingRequiredFields
    };
  }

  if (!input.patchContent || !input.patchContent.trim()) {
    return {
      ok: false,
      message: 'Patch vazio: nao ha alteracao tecnica para incluir no pacote.',
      errorCode: 'INVALID_PATCH'
    };
  }

  const packageId = randomUUID();
  const prMarkdown = buildMiniPrMarkdown(miniPr, {
    environmentName: input.preview.environment.environmentName,
    branch: input.preview.workspace.branch,
    baseBranch: input.preview.workspace.baseBranch,
    author: input.author,
    generatedAt,
    files: input.preview.workspace.files
  });
  const artifacts: SvnflowPackageArtifacts = {
    'preview.json': input.preview,
    'pr.md': prMarkdown,
    'patch.diff': input.patchContent,
    'mini-pr.json': miniPr
  };

  const manifest: SvnflowManifest = {
    formatVersion: CURRENT_SVNFLOW_FORMAT_VERSION,
    packageId,
    generatedAt,
    checksumAlgorithm: 'sha256',
    checksum: calculateArtifactsChecksum(artifacts),
    requiredFields: [
      'manifest.formatVersion',
      'manifest.packageId',
      'manifest.generatedAt',
      'manifest.checksum',
      'artifacts.preview.json',
      'artifacts.pr.md',
      'artifacts.patch.diff'
    ],
    author: input.author,
    artifacts: {
      previewJson: 'preview.json',
      prMarkdown: 'pr.md',
      patchDiff: 'patch.diff',
      miniPrJson: 'mini-pr.json'
    }
  };

  const packageFile: SvnflowPackageFile = {
    manifest,
    artifacts
  };

  const packagePath = path.join(outputDirectory, buildSuggestedPackageFileName(miniPr.title, generatedAt));

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
