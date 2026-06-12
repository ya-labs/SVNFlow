import { execSync } from 'child_process';

export type GitWorkspaceStateStatus = 'ready' | 'blocked' | 'error';

export interface GitWorkspaceStateResult {
  status: GitWorkspaceStateStatus;
  message: string;
  path: string;
  branch?: string;
  baseBranch: string;
  detachedHead: boolean;
  hasChanges: boolean;
  error?: string;
}

export interface GitWorkspaceStateInput {
  gitRepositoryPath: string;
  baseBranch?: string;
}

export interface GitComparisonBaseValidationResult {
  status: GitWorkspaceStateStatus;
  valid: boolean;
  message: string;
  path: string;
  baseBranch: string;
  error?: string;
}

export function validateGitComparisonBase(input: GitWorkspaceStateInput): GitComparisonBaseValidationResult {
  const baseBranch = input.baseBranch ?? 'main';

  try {
    execSync(`git -C "${input.gitRepositoryPath}" rev-parse --verify "${baseBranch}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    return {
      status: 'ready',
      valid: true,
      message: `Base de comparação ${baseBranch} encontrada.`,
      path: input.gitRepositoryPath,
      baseBranch
    };
  } catch (error) {
    if (error instanceof Error) {
      if ('code' in error && error.code === 'ETIMEDOUT') {
        return {
          status: 'error',
          valid: false,
          message: 'Timeout ao validar base de comparação Git (limite de 5 segundos excedido).',
          path: input.gitRepositoryPath,
          baseBranch,
          error: 'ETIMEDOUT'
        };
      }

      if ('status' in error && typeof error.status === 'number') {
        return {
          status: 'blocked',
          valid: false,
          message: `Base de comparação ${baseBranch} não encontrada no repositório Git local.`,
          path: input.gitRepositoryPath,
          baseBranch,
          error: 'BASE_NOT_FOUND'
        };
      }

      return {
        status: 'error',
        valid: false,
        message: `Falha ao validar base de comparação Git: ${error.message}`,
        path: input.gitRepositoryPath,
        baseBranch,
        error: error.message
      };
    }

    return {
      status: 'error',
      valid: false,
      message: 'Erro desconhecido ao validar base de comparação Git.',
      path: input.gitRepositoryPath,
      baseBranch,
      error: 'UNKNOWN_ERROR'
    };
  }
}

export function readGitWorkspaceState(input: GitWorkspaceStateInput): GitWorkspaceStateResult {
  const baseBranch = input.baseBranch ?? 'main';

  try {
    const branch = execSync(`git -C "${input.gitRepositoryPath}" branch --show-current`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!branch) {
      return {
        status: 'blocked',
        message: 'Repositório Git em detached HEAD.',
        path: input.gitRepositoryPath,
        baseBranch,
        detachedHead: true,
        hasChanges: false,
        error: 'DETACHED_HEAD'
      };
    }

    const baseValidation = validateGitComparisonBase({
      gitRepositoryPath: input.gitRepositoryPath,
      baseBranch
    });

    if (!baseValidation.valid) {
      return {
        status: baseValidation.status,
        message: baseValidation.message,
        path: input.gitRepositoryPath,
        branch,
        baseBranch,
        detachedHead: false,
        hasChanges: false,
        error: baseValidation.error
      };
    }

    const statusOutput = execSync(`git -C "${input.gitRepositoryPath}" status --porcelain`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    return {
      status: 'ready',
      message: `Workspace Git pronto na branch ${branch}.`,
      path: input.gitRepositoryPath,
      branch,
      baseBranch,
      detachedHead: false,
      hasChanges: statusOutput.length > 0
    };
  } catch (error) {
    if (error instanceof Error) {
      if ('code' in error && error.code === 'ETIMEDOUT') {
        return {
          status: 'error',
          message: 'Timeout ao validar workspace Git (limite de 5 segundos excedido).',
          path: input.gitRepositoryPath,
          baseBranch,
          detachedHead: false,
          hasChanges: false,
          error: 'ETIMEDOUT'
        };
      }

      return {
        status: 'error',
        message: `Falha ao validar workspace Git: ${error.message}`,
        path: input.gitRepositoryPath,
        baseBranch,
        detachedHead: false,
        hasChanges: false,
        error: error.message
      };
    }

    return {
      status: 'error',
      message: 'Erro desconhecido ao validar workspace Git.',
      path: input.gitRepositoryPath,
      baseBranch,
      detachedHead: false,
      hasChanges: false,
      error: 'UNKNOWN_ERROR'
    };
  }
}
