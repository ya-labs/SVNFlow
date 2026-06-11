import {
  validateGitAvailability,
  validateGitRepository,
  type GitRepositoryValidationResult,
  type GitValidationResult
} from './git';
import {
  validateSvnAvailability,
  validateSvnCheckout,
  type SvnCheckoutValidationResult,
  type SvnValidationResult
} from './svn';
import { execSync } from 'child_process';

export type EnvironmentStateStatus = 'ready' | 'blocked' | 'error';

export interface EnvironmentStateResult {
  status: EnvironmentStateStatus;
  message: string;
  git: {
    availability: GitValidationResult & { status: EnvironmentStateStatus };
    repository: GitRepositoryValidationResult & { status: EnvironmentStateStatus };
    workspace: GitWorkspaceStateResult;
  };
  svn: {
    availability: SvnValidationResult & { status: EnvironmentStateStatus };
    checkout: SvnCheckoutValidationResult & { status: EnvironmentStateStatus };
  };
}

export interface GitWorkspaceStateResult {
  status: EnvironmentStateStatus;
  message: string;
  path: string;
  branch?: string;
  baseBranch: string;
  detachedHead: boolean;
  hasChanges: boolean;
  error?: string;
}

export interface EnvironmentStateInput {
  gitRepositoryPath: string;
  svnCheckoutPath: string;
  baseBranch?: string;
}

function classifyFromValidation(error?: string): EnvironmentStateStatus {
  if (!error) {
    return 'ready';
  }

  if (error === 'ENOENT') {
    return 'blocked';
  }

  return error === 'ETIMEDOUT' ? 'error' : 'error';
}

function combineStatus(statuses: EnvironmentStateStatus[]): EnvironmentStateStatus {
  if (statuses.includes('error')) {
    return 'error';
  }

  if (statuses.includes('blocked')) {
    return 'blocked';
  }

  return 'ready';
}

function readGitWorkspaceState(gitRepositoryPath: string, baseBranch: string): GitWorkspaceStateResult {
  try {
    const branch = execSync(`git -C "${gitRepositoryPath}" branch --show-current`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!branch) {
      return {
        status: 'blocked',
        message: 'Repositório Git em detached HEAD.',
        path: gitRepositoryPath,
        baseBranch,
        detachedHead: true,
        hasChanges: false,
        error: 'DETACHED_HEAD'
      };
    }

    execSync(`git -C "${gitRepositoryPath}" rev-parse --verify "${baseBranch}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const statusOutput = execSync(`git -C "${gitRepositoryPath}" status --porcelain`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    return {
      status: 'ready',
      message: `Workspace Git pronto na branch ${branch}.`,
      path: gitRepositoryPath,
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
          path: gitRepositoryPath,
          baseBranch,
          detachedHead: false,
          hasChanges: false,
          error: 'ETIMEDOUT'
        };
      }

      return {
        status: 'error',
        message: `Falha ao validar workspace Git: ${error.message}`,
        path: gitRepositoryPath,
        baseBranch,
        detachedHead: false,
        hasChanges: false,
        error: error.message
      };
    }

    return {
      status: 'error',
      message: 'Erro desconhecido ao validar workspace Git.',
      path: gitRepositoryPath,
      baseBranch,
      detachedHead: false,
      hasChanges: false,
      error: 'UNKNOWN_ERROR'
    };
  }
}

export function validateEnvironmentState(input: EnvironmentStateInput): EnvironmentStateResult {
  const baseBranch = input.baseBranch ?? 'main';

  const gitAvailability = validateGitAvailability();
  const svnAvailability = validateSvnAvailability();
  const gitRepository = validateGitRepository(input.gitRepositoryPath);
  const svnCheckout = validateSvnCheckout(input.svnCheckoutPath);

  const gitAvailabilityStatus = classifyFromValidation(gitAvailability.error);
  const svnAvailabilityStatus = classifyFromValidation(svnAvailability.error);
  const gitRepositoryStatus = gitRepository.valid ? 'ready' : classifyFromValidation(gitRepository.error);
  const svnCheckoutStatus = svnCheckout.valid ? 'ready' : classifyFromValidation(svnCheckout.error);

  const workspaceReady = gitAvailabilityStatus === 'ready' && gitRepositoryStatus === 'ready';
  const gitWorkspace = workspaceReady
    ? readGitWorkspaceState(input.gitRepositoryPath, baseBranch)
    : {
        status: combineStatus([gitAvailabilityStatus, gitRepositoryStatus]),
        message: gitAvailabilityStatus !== 'ready'
          ? gitAvailability.message
          : gitRepository.message,
        path: input.gitRepositoryPath,
        baseBranch,
        detachedHead: false,
        hasChanges: false,
        error: gitAvailabilityStatus !== 'ready' ? gitAvailability.error : gitRepository.error
      } satisfies GitWorkspaceStateResult;

  const status = combineStatus([
    gitAvailabilityStatus,
    svnAvailabilityStatus,
    gitRepositoryStatus,
    gitWorkspace.status,
    svnCheckoutStatus
  ]);

  const message =
    status === 'ready'
      ? 'Ambiente pronto para leitura e revisão.'
      : status === 'blocked'
        ? gitWorkspace.status === 'blocked'
          ? gitWorkspace.message
          : gitRepositoryStatus === 'blocked'
            ? gitRepository.message
            : svnCheckoutStatus === 'blocked'
              ? svnCheckout.message
              : gitAvailabilityStatus === 'blocked'
                ? gitAvailability.message
                : svnAvailabilityStatus === 'blocked'
                  ? svnAvailability.message
                  : 'Ambiente bloqueado por uma pré-condição não atendida.'
        : gitWorkspace.status === 'error'
          ? gitWorkspace.message
          : gitAvailabilityStatus === 'error'
            ? gitAvailability.message
            : svnAvailabilityStatus === 'error'
              ? svnAvailability.message
              : gitRepositoryStatus === 'error'
                ? gitRepository.message
                : svnCheckoutStatus === 'error'
                  ? svnCheckout.message
                  : 'Falha ao consolidar o estado do ambiente.';

  return {
    status,
    message,
    git: {
      availability: {
        ...gitAvailability,
        status: gitAvailabilityStatus
      },
      repository: {
        ...gitRepository,
        status: gitRepositoryStatus
      },
      workspace: gitWorkspace
    },
    svn: {
      availability: {
        ...svnAvailability,
        status: svnAvailabilityStatus
      },
      checkout: {
        ...svnCheckout,
        status: svnCheckoutStatus
      }
    }
  };
}