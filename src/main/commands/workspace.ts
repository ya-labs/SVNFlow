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
  changedFiles: GitChangedFile[];
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

export type GitChangedFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unknown';

export interface GitChangedFile {
  path: string;
  status: GitChangedFileStatus;
  rawStatus: string;
  previousPath?: string;
}

export interface GitChangedFilesResult {
  status: GitWorkspaceStateStatus;
  message: string;
  path: string;
  baseBranch: string;
  files: GitChangedFile[];
  error?: string;
}

function mapGitFileStatus(rawStatus: string): GitChangedFileStatus {
  const status = rawStatus.charAt(0);

  if (status === 'A') {
    return 'added';
  }

  if (status === 'M') {
    return 'modified';
  }

  if (status === 'D') {
    return 'deleted';
  }

  if (status === 'R') {
    return 'renamed';
  }

  if (status === 'C') {
    return 'copied';
  }

  return 'unknown';
}

function parseGitChangedFiles(output: string): GitChangedFile[] {
  if (!output.trim()) {
    return [];
  }

  return output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [rawStatus, firstPath, secondPath] = line.split('\t');
      const status = mapGitFileStatus(rawStatus);
      const hasPreviousPath = status === 'renamed' || status === 'copied';

      return {
        path: hasPreviousPath ? secondPath : firstPath,
        previousPath: hasPreviousPath ? firstPath : undefined,
        status,
        rawStatus
      };
    });
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

export function listGitChangedFiles(input: GitWorkspaceStateInput): GitChangedFilesResult {
  const baseBranch = input.baseBranch ?? 'main';
  const baseValidation = validateGitComparisonBase({
    gitRepositoryPath: input.gitRepositoryPath,
    baseBranch
  });

  if (!baseValidation.valid) {
    return {
      status: baseValidation.status,
      message: baseValidation.message,
      path: input.gitRepositoryPath,
      baseBranch,
      files: [],
      error: baseValidation.error
    };
  }

  try {
    const output = execSync(`git -C "${input.gitRepositoryPath}" diff --name-status "${baseBranch}...HEAD"`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const files = parseGitChangedFiles(output);

    return {
      status: 'ready',
      message: files.length > 0
        ? `${files.length} arquivo(s) alterado(s) em relação à base ${baseBranch}.`
        : `Nenhum arquivo alterado em relação à base ${baseBranch}.`,
      path: input.gitRepositoryPath,
      baseBranch,
      files
    };
  } catch (error) {
    if (error instanceof Error) {
      if ('code' in error && error.code === 'ETIMEDOUT') {
        return {
          status: 'error',
          message: 'Timeout ao listar arquivos alterados do workspace Git (limite de 5 segundos excedido).',
          path: input.gitRepositoryPath,
          baseBranch,
          files: [],
          error: 'ETIMEDOUT'
        };
      }

      return {
        status: 'error',
        message: `Falha ao listar arquivos alterados do workspace Git: ${error.message}`,
        path: input.gitRepositoryPath,
        baseBranch,
        files: [],
        error: error.message
      };
    }

    return {
      status: 'error',
      message: 'Erro desconhecido ao listar arquivos alterados do workspace Git.',
      path: input.gitRepositoryPath,
      baseBranch,
      files: [],
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
        changedFiles: [],
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
        changedFiles: [],
        error: baseValidation.error
      };
    }

    const changedFiles = listGitChangedFiles({
      gitRepositoryPath: input.gitRepositoryPath,
      baseBranch
    });

    if (changedFiles.status !== 'ready') {
      return {
        status: changedFiles.status,
        message: changedFiles.message,
        path: input.gitRepositoryPath,
        branch,
        baseBranch,
        detachedHead: false,
        hasChanges: false,
        changedFiles: [],
        error: changedFiles.error
      };
    }

    return {
      status: 'ready',
      message: `Workspace Git pronto na branch ${branch}.`,
      path: input.gitRepositoryPath,
      branch,
      baseBranch,
      detachedHead: false,
      hasChanges: changedFiles.files.length > 0,
      changedFiles: changedFiles.files
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
          changedFiles: [],
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
        changedFiles: [],
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
      changedFiles: [],
      error: 'UNKNOWN_ERROR'
    };
  }
}
