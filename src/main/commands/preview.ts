import { validateEnvironmentState, type EnvironmentStateResult, type EnvironmentStateStatus } from './environment';
import type { GitChangedFile } from './workspace';

export interface SelectedEnvironment {
  id: string;
  name: string;
  gitWorkspacePath: string;
  svnCheckoutPath: string;
}

export interface PreviewEnvironmentContext extends SelectedEnvironment {
  svnCheckoutRoot?: string;
}

export interface PreviewWorkspaceContext {
  branch?: string;
  baseBranch: string;
  hasChanges: boolean;
  changedFilesCount: number;
  changedFiles: GitChangedFile[];
}

export interface PreviewContextResult {
  status: EnvironmentStateStatus;
  canPreview: boolean;
  message: string;
  environment?: PreviewEnvironmentContext;
  workspace?: PreviewWorkspaceContext;
  blockers: string[];
}

export interface PreviewContextInput {
  selectedEnvironment?: SelectedEnvironment;
  baseBranch?: string;
}

function createEnvironmentContext(
  selectedEnvironment: SelectedEnvironment,
  state?: EnvironmentStateResult
): PreviewEnvironmentContext {
  return {
    ...selectedEnvironment,
    svnCheckoutRoot: state?.svn.checkout.checkoutRoot
  };
}

export function buildPreviewContext(input: PreviewContextInput): PreviewContextResult {
  if (!input.selectedEnvironment) {
    return {
      status: 'blocked',
      canPreview: false,
      message: 'Selecione um ambiente válido antes de gerar o preview.',
      blockers: ['NO_SELECTED_ENVIRONMENT']
    };
  }

  const state = validateEnvironmentState({
    gitRepositoryPath: input.selectedEnvironment.gitWorkspacePath,
    svnCheckoutPath: input.selectedEnvironment.svnCheckoutPath,
    baseBranch: input.baseBranch
  });

  const environment = createEnvironmentContext(input.selectedEnvironment, state);

  if (state.status !== 'ready') {
    return {
      status: state.status,
      canPreview: false,
      message: state.message,
      environment,
      workspace: {
        branch: state.git.workspace.branch,
        baseBranch: state.git.workspace.baseBranch,
        hasChanges: state.git.workspace.hasChanges,
        changedFilesCount: state.git.workspace.changedFiles.length,
        changedFiles: state.git.workspace.changedFiles
      },
      blockers: [state.git.workspace.error, state.git.repository.error, state.svn.checkout.error]
        .filter((error): error is string => Boolean(error))
    };
  }

  return {
    status: 'ready',
    canPreview: true,
    message: `Preview pronto para o ambiente ${input.selectedEnvironment.name}.`,
    environment,
    workspace: {
      branch: state.git.workspace.branch,
      baseBranch: state.git.workspace.baseBranch,
      hasChanges: state.git.workspace.hasChanges,
      changedFilesCount: state.git.workspace.changedFiles.length,
      changedFiles: state.git.workspace.changedFiles
    },
    blockers: []
  };
}
