import { execSync } from 'node:child_process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { validateGitRepository } from './git.js';
import { validateGitComparisonBase } from './workspace.js';
import { saveSavedEnvironment, type SaveSavedEnvironmentInput, type SavedEnvironmentStorageErrorCode } from './saved-environment-store.js';
import type { SavedEnvironment } from './saved-environments.js';
import { validateSvnCheckout } from './svn.js';

export type RegisterSavedEnvironmentErrorCode =
  | 'INVALID_NAME'
  | 'INVALID_GIT_WORKSPACE'
  | 'INVALID_BASE_BRANCH'
  | 'INVALID_SVN_CHECKOUT'
  | 'STORAGE_ERROR';

export interface RegisterSavedEnvironmentBlocker {
  code: RegisterSavedEnvironmentErrorCode;
  message: string;
}

export interface RegisterSavedEnvironmentInput {
  name?: string;
  gitWorkspacePath: string;
  svnCheckoutPath: string;
  baseBranch?: string;
  storagePath?: string;
  now?: string;
}

export interface RegisterSavedEnvironmentResult {
  canSave: boolean;
  message: string;
  suggestedName: string;
  savedEnvironment?: SavedEnvironment;
  blockers: RegisterSavedEnvironmentBlocker[];
  storagePath?: string;
  storageErrorCode?: SavedEnvironmentStorageErrorCode;
}

interface SvnCheckoutMetadata {
  svnUrl?: string;
  svnCheckoutRoot?: string;
  svnRevision?: string;
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim();
}

function detectSvnInfoItem(svnCheckoutPath: string, item: string): string | undefined {
  try {
    const output = execSync(`svn info --show-item ${item} "${svnCheckoutPath}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    return output.length > 0 ? output : undefined;
  } catch {
    return undefined;
  }
}

function detectSvnCheckoutMetadata(svnCheckoutPath: string): SvnCheckoutMetadata {
  return {
    svnUrl: detectSvnInfoItem(svnCheckoutPath, 'url'),
    svnCheckoutRoot: detectSvnInfoItem(svnCheckoutPath, 'wc-root'),
    svnRevision: detectSvnInfoItem(svnCheckoutPath, 'revision')
  };
}

function buildSuggestedName(gitWorkspacePath: string): string {
  const workspaceName = path.basename(gitWorkspacePath).trim();
  return workspaceName.length > 0 ? workspaceName : 'Ambiente Local';
}

function mapStorageErrorMessage(errorCode: SavedEnvironmentStorageErrorCode | undefined, fallback: string): string {
  if (errorCode === 'ALREADY_EXISTS') {
    return 'Já existe um ambiente salvo com este identificador. Tente novamente.';
  }

  if (errorCode === 'INVALID_ENVIRONMENT') {
    return 'Os dados do ambiente salvo estão inválidos. Revise nome e caminhos informados.';
  }

  if (errorCode === 'WRITE_FAILED' || errorCode === 'READ_FAILED' || errorCode === 'INVALID_STORAGE_FILE') {
    return 'Falha ao acessar o armazenamento local de ambientes salvos. Verifique permissões e tente novamente.';
  }

  return fallback;
}

export async function registerSavedEnvironmentFromLocalPaths(
  input: RegisterSavedEnvironmentInput
): Promise<RegisterSavedEnvironmentResult> {
  const gitWorkspacePath = normalizeText(input.gitWorkspacePath);
  const svnCheckoutPath = normalizeText(input.svnCheckoutPath);
  const suggestedName = buildSuggestedName(gitWorkspacePath);
  const resolvedName = normalizeText(input.name) || suggestedName;

  if (!resolvedName) {
    return {
      canSave: false,
      message: 'Informe um nome amigável para o ambiente antes de salvar.',
      suggestedName,
      blockers: [
        {
          code: 'INVALID_NAME',
          message: 'O nome amigável do ambiente está vazio.'
        }
      ]
    };
  }

  const gitValidation = validateGitRepository(gitWorkspacePath);

  if (!gitValidation.valid) {
    return {
      canSave: false,
      message: 'Workspace Git inválido. Escolha uma pasta que contenha um repositório Git válido.',
      suggestedName,
      blockers: [
        {
          code: 'INVALID_GIT_WORKSPACE',
          message: gitValidation.message
        }
      ]
    };
  }

  const baseBranch = normalizeText(input.baseBranch) || 'main';
  const baseValidation = validateGitComparisonBase({ gitRepositoryPath: gitWorkspacePath, baseBranch });

  if (!baseValidation.valid) {
    return {
      canSave: false,
      message: `Base de comparação ${baseBranch} não encontrada no workspace Git. Informe uma branch local existente.`,
      suggestedName,
      blockers: [
        {
          code: 'INVALID_BASE_BRANCH',
          message: baseValidation.message
        }
      ]
    };
  }

  const svnValidation = validateSvnCheckout(svnCheckoutPath);

  if (!svnValidation.valid) {
    return {
      canSave: false,
      message: 'Checkout SVN inválido. Escolha uma pasta que contenha um checkout SVN válido.',
      suggestedName,
      blockers: [
        {
          code: 'INVALID_SVN_CHECKOUT',
          message: svnValidation.message
        }
      ]
    };
  }

  const metadata = detectSvnCheckoutMetadata(svnCheckoutPath);
  const now = input.now ?? new Date().toISOString();

  const environment: SavedEnvironment = {
    id: randomUUID(),
    name: resolvedName,
    gitWorkspacePath,
    svnCheckoutPath,
    baseBranch,
    svnUrl: metadata.svnUrl,
    svnCheckoutRoot: metadata.svnCheckoutRoot ?? svnValidation.checkoutRoot,
    svnRevision: metadata.svnRevision,
    lastValidatedAt: now,
    lastValidationStatus: 'ready'
  };

  const saveInput: SaveSavedEnvironmentInput = {
    storagePath: input.storagePath,
    environment
  };

  const saveResult = await saveSavedEnvironment(saveInput);

  if (!saveResult.ok) {
    return {
      canSave: false,
      message: mapStorageErrorMessage(saveResult.errorCode, saveResult.message),
      suggestedName,
      blockers: [
        {
          code: 'STORAGE_ERROR',
          message: saveResult.message
        }
      ],
      storagePath: saveResult.storagePath,
      storageErrorCode: saveResult.errorCode
    };
  }

  return {
    canSave: true,
    message: `Ambiente ${resolvedName} salvo com sucesso.`,
    suggestedName,
    savedEnvironment: environment,
    blockers: [],
    storagePath: saveResult.storagePath
  };
}