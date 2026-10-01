import { validateSvnAvailability, validateSvnCheckout } from './svn.js';
import { validateEnvironmentState, type EnvironmentStateInput, type EnvironmentStateStatus } from './environment.js';
import type { SavedEnvironment } from './saved-environments.js';

export interface RevalidationBlocker {
  code: string;
  message: string;
}

export interface RevalidatedEnvironment {
  id: string;
  name: string;
  gitWorkspacePath?: string;
  svnCheckoutPath: string;
  currentValidationStatus: EnvironmentStateStatus;
  isValid: boolean;
  safeForSensitiveOperations: boolean;
  blockers: RevalidationBlocker[];
  message: string;
}

export interface RevalidateEnvironmentInput {
  environment: SavedEnvironment;
  baseBranch?: string;
}

export interface RevalidateEnvironmentResult {
  environment?: RevalidatedEnvironment;
  blockers: RevalidationBlocker[];
  message: string;
  canAdvance: boolean;
  safeForSensitiveOperations: boolean;
}

function extractBlockers(status: EnvironmentStateStatus, message: string): RevalidationBlocker[] {
  const blockers: RevalidationBlocker[] = [];

  if (status === 'blocked') {
    if (message.includes('Git')) {
      blockers.push({
        code: 'GIT_UNAVAILABLE',
        message: 'Git não encontrado neste ambiente.'
      });
    }

    if (message.includes('SVN')) {
      blockers.push({
        code: 'SVN_UNAVAILABLE',
        message: 'SVN não encontrado neste ambiente.'
      });
    }

    if (message.includes('repositório Git')) {
      blockers.push({
        code: 'GIT_REPOSITORY_INVALID',
        message: 'O caminho do workspace Git não é um repositório válido.'
      });
    }

    if (message.includes('checkout SVN')) {
      blockers.push({
        code: 'SVN_CHECKOUT_INVALID',
        message: 'O caminho do checkout SVN não é um checkout válido.'
      });
    }

    if (message.includes('detached HEAD')) {
      blockers.push({
        code: 'GIT_DETACHED_HEAD',
        message: 'Repositório Git em detached HEAD.'
      });
    }
  }

  if (status === 'error') {
    blockers.push({
      code: 'VALIDATION_ERROR',
      message: 'Erro ao validar o ambiente. Verifique caminhos e permissões.'
    });
  }

  return blockers.length > 0 ? blockers : [];
}

// Projeto só SVN: valida o cliente svn e o checkout, sem exigir Git.
function validateSvnOnly(svnCheckoutPath: string): { status: EnvironmentStateStatus; message: string } {
  const availability = validateSvnAvailability();

  if (!availability.available) {
    return { status: availability.error === 'ENOENT' ? 'blocked' : 'error', message: availability.message };
  }

  const checkout = validateSvnCheckout(svnCheckoutPath);

  if (!checkout.valid) {
    return { status: checkout.error === 'ETIMEDOUT' ? 'error' : 'blocked', message: checkout.message };
  }

  return { status: 'ready', message: 'Checkout SVN pronto.' };
}

export function revalidateEnvironment(input: RevalidateEnvironmentInput): RevalidateEnvironmentResult {
  const gitWorkspacePath = input.environment.gitWorkspacePath;
  const validation = !gitWorkspacePath ? validateSvnOnly(input.environment.svnCheckoutPath) : validateEnvironmentState({
    gitRepositoryPath: gitWorkspacePath,
    svnCheckoutPath: input.environment.svnCheckoutPath,
    baseBranch: input.baseBranch
  });

  const blockers = extractBlockers(validation.status, validation.message);
  const isValid = validation.status === 'ready';
  const safeForSensitiveOperations = isValid;

  if (!isValid) {
    return {
      blockers,
      message: validation.message,
      canAdvance: false,
      safeForSensitiveOperations: false
    };
  }

  return {
    environment: {
      id: input.environment.id,
      name: input.environment.name,
      gitWorkspacePath: input.environment.gitWorkspacePath,
      svnCheckoutPath: input.environment.svnCheckoutPath,
      currentValidationStatus: validation.status,
      isValid: true,
      safeForSensitiveOperations: true,
      blockers: [],
      message: `Ambiente ${input.environment.name} validado com sucesso.`
    },
    blockers: [],
    message: validation.message,
    canAdvance: true,
    safeForSensitiveOperations: true
  };
}
