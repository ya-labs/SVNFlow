import {
  validateGitAvailability,
  validateGitRepository,
  type GitRepositoryValidationResult,
  type GitValidationResult
} from './git.js';
import {
  validateSvnAvailability,
  validateSvnCheckout,
  type SvnCheckoutValidationResult,
  type SvnValidationResult
} from './svn.js';
import { readGitWorkspaceState, type GitWorkspaceStateResult } from './workspace.js';

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
    ? readGitWorkspaceState({
        gitRepositoryPath: input.gitRepositoryPath,
        baseBranch
      })
    : {
        status: combineStatus([gitAvailabilityStatus, gitRepositoryStatus]),
        message: gitAvailabilityStatus !== 'ready'
          ? gitAvailability.message
          : gitRepository.message,
        path: input.gitRepositoryPath,
        baseBranch,
        detachedHead: false,
        hasChanges: false,
        changedFiles: [],
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
