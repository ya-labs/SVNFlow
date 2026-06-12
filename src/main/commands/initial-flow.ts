import { validateEnvironmentState, type EnvironmentStateInput } from './environment';
import { selectSavedEnvironment, type SavedEnvironment, type SelectSavedEnvironmentInput } from './saved-environments';

export interface InitialFlowWorkspaceSummary {
  branch?: string;
  baseBranch: string;
  hasChanges: boolean;
  changedFilesCount: number;
}

export interface InitialFlowGateResult {
  canAdvance: boolean;
  message: string;
  workspace: InitialFlowWorkspaceSummary;
}

export interface InitialFlowLoadedEnvironment {
  gitRepositoryPath: string;
  svnCheckoutPath: string;
  selectedEnvironmentId: string;
  selectedEnvironmentName: string;
  needsRevalidation: boolean;
  safeForSensitiveOperations: boolean;
  message: string;
}

export function checkInitialFlowGate(input: EnvironmentStateInput): InitialFlowGateResult {
  const state = validateEnvironmentState(input);
  const workspace = {
    branch: state.git.workspace.branch,
    baseBranch: state.git.workspace.baseBranch,
    hasChanges: state.git.workspace.hasChanges,
    changedFilesCount: state.git.workspace.changedFiles.length
  };

  if (state.status === 'ready') {
    return {
      canAdvance: true,
      message: state.message,
      workspace
    };
  }

  return {
    canAdvance: false,
    message: state.message,
    workspace
  };
}

export function loadInitialFlowFromSavedEnvironment(
  environmentId: string,
  environments: SavedEnvironment[],
  options?: Omit<SelectSavedEnvironmentInput, 'environmentId' | 'environments'>
): InitialFlowLoadedEnvironment {
  const selection = selectSavedEnvironment({
    environments,
    environmentId,
    now: options?.now,
    revalidationMaxAgeMinutes: options?.revalidationMaxAgeMinutes
  });

  if (!selection.selectedEnvironment) {
    return {
      gitRepositoryPath: '',
      svnCheckoutPath: '',
      selectedEnvironmentId: environmentId,
      selectedEnvironmentName: '',
      needsRevalidation: true,
      safeForSensitiveOperations: false,
      message: selection.message
    };
  }

  return {
    gitRepositoryPath: selection.selectedEnvironment.gitWorkspacePath,
    svnCheckoutPath: selection.selectedEnvironment.svnCheckoutPath,
    selectedEnvironmentId: selection.selectedEnvironment.id,
    selectedEnvironmentName: selection.selectedEnvironment.name,
    needsRevalidation: selection.needsRevalidation,
    safeForSensitiveOperations: selection.safeForSensitiveOperations,
    message: selection.message
  };
}
