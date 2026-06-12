import { validateEnvironmentState, type EnvironmentStateInput } from './environment';
import { selectSavedEnvironment, type SavedEnvironment, type SelectSavedEnvironmentInput } from './saved-environments';
import { revalidateEnvironment, type RevalidationBlocker } from './revalidate-environment';

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
  blockers?: RevalidationBlocker[];
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

export interface LoadInitialFlowOptions {
  revalidationMaxAgeMinutes?: number;
  baseBranch?: string;
  performRevalidation?: boolean;
}

export function loadInitialFlowFromSavedEnvironment(
  environmentId: string,
  environments: SavedEnvironment[],
  options?: LoadInitialFlowOptions
): InitialFlowLoadedEnvironment {
  const selection = selectSavedEnvironment({
    environments,
    environmentId,
    now: undefined,
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

  // Se performRevalidation é false, retorna sem fazer validação real
  if (options?.performRevalidation === false) {
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

  // Executa revalidação em tempo real
  const revalidation = revalidateEnvironment({
    environment: selection.selectedEnvironment,
    baseBranch: options?.baseBranch
  });

  return {
    gitRepositoryPath: selection.selectedEnvironment.gitWorkspacePath,
    svnCheckoutPath: selection.selectedEnvironment.svnCheckoutPath,
    selectedEnvironmentId: selection.selectedEnvironment.id,
    selectedEnvironmentName: selection.selectedEnvironment.name,
    needsRevalidation: !revalidation.canAdvance,
    safeForSensitiveOperations: revalidation.safeForSensitiveOperations,
    message: revalidation.message,
    blockers: revalidation.blockers
  };
}
