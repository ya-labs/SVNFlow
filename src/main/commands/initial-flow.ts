import { validateEnvironmentState, type EnvironmentStateInput } from './environment';

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
