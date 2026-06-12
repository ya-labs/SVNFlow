import { validateEnvironmentState, type EnvironmentStateResult, type EnvironmentStateStatus } from './environment';
import type { GitChangedFile, GitChangedFileStatus } from './workspace';
import type { SelectedEnvironment } from './saved-environments';

export type { SelectedEnvironment } from './saved-environments';

export interface PreviewEnvironmentContext extends SelectedEnvironment {
  svnCheckoutRoot?: string;
}

export interface ClassifiedGitChangedFile extends GitChangedFile {
  humanReadableStatus: string;
  description: string;
}

export interface PreviewWorkspaceContext {
  branch?: string;
  baseBranch: string;
  hasChanges: boolean;
  changedFilesCount: number;
  changedFiles: GitChangedFile[];
  classifiedFiles: ClassifiedGitChangedFile[];
}

export interface PreviewChangedFilesTotals {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  copied: number;
  unknown: number;
}

export interface PreviewSummary {
  branch?: string;
  baseBranch: string;
  activeEnvironment: {
    id: string;
    name: string;
  };
  totalAffectedFiles: number;
  totalsByChangeType: PreviewChangedFilesTotals;
  hasSufficientChanges: boolean;
}

export interface PreviewContextResult {
  status: EnvironmentStateStatus;
  canPreview: boolean;
  message: string;
  environment?: PreviewEnvironmentContext;
  workspace?: PreviewWorkspaceContext;
  summary?: PreviewSummary;
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

function getHumanReadableStatus(status: GitChangedFileStatus): string {
  const statusMap: Record<GitChangedFileStatus, string> = {
    added: 'Criado',
    modified: 'Modificado',
    deleted: 'Removido',
    renamed: 'Renomeado',
    copied: 'Copiado',
    unknown: 'Desconhecido'
  };
  return statusMap[status];
}

function generateChangeDescription(file: GitChangedFile): string {
  const humanStatus = getHumanReadableStatus(file.status);

  if (file.status === 'renamed' && file.previousPath) {
    return `${humanStatus}: ${file.previousPath} → ${file.path}`;
  }

  if (file.status === 'copied' && file.previousPath) {
    return `${humanStatus}: ${file.previousPath} → ${file.path}`;
  }

  return `${humanStatus}: ${file.path}`;
}

function classifyChangedFiles(files: GitChangedFile[]): ClassifiedGitChangedFile[] {
  return files.map((file) => ({
    ...file,
    humanReadableStatus: getHumanReadableStatus(file.status),
    description: generateChangeDescription(file)
  }));
}

function calculateChangedFilesTotals(changedFiles: GitChangedFile[]): PreviewChangedFilesTotals {
  return changedFiles.reduce<PreviewChangedFilesTotals>((totals, file) => {
    if (file.status === 'added') {
      totals.added += 1;
      return totals;
    }

    if (file.status === 'modified') {
      totals.modified += 1;
      return totals;
    }

    if (file.status === 'deleted') {
      totals.deleted += 1;
      return totals;
    }

    if (file.status === 'renamed') {
      totals.renamed += 1;
      return totals;
    }

    if (file.status === 'copied') {
      totals.copied += 1;
      return totals;
    }

    totals.unknown += 1;
    return totals;
  }, {
    added: 0,
    modified: 0,
    deleted: 0,
    renamed: 0,
    copied: 0,
    unknown: 0
  });
}

function createPreviewSummary(
  selectedEnvironment: SelectedEnvironment,
  workspace: PreviewWorkspaceContext
): PreviewSummary {
  return {
    branch: workspace.branch,
    baseBranch: workspace.baseBranch,
    activeEnvironment: {
      id: selectedEnvironment.id,
      name: selectedEnvironment.name
    },
    totalAffectedFiles: workspace.changedFilesCount,
    totalsByChangeType: calculateChangedFilesTotals(workspace.changedFiles),
    hasSufficientChanges: workspace.changedFilesCount > 0
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
  const workspace = {
    branch: state.git.workspace.branch,
    baseBranch: state.git.workspace.baseBranch,
    hasChanges: state.git.workspace.hasChanges,
    changedFilesCount: state.git.workspace.changedFiles.length,
    changedFiles: state.git.workspace.changedFiles,
    classifiedFiles: classifyChangedFiles(state.git.workspace.changedFiles)
  };
  const summary = createPreviewSummary(input.selectedEnvironment, workspace);

  if (state.status !== 'ready') {
    return {
      status: state.status,
      canPreview: false,
      message: state.message,
      environment,
      workspace,
      summary,
      blockers: [state.git.workspace.error, state.git.repository.error, state.svn.checkout.error]
        .filter((error): error is string => Boolean(error))
    };
  }

  if (!summary.hasSufficientChanges) {
    return {
      status: 'ready',
      canPreview: true,
      message: `Nenhuma alteração encontrada para o ambiente ${input.selectedEnvironment.name}.`,
      environment,
      workspace,
      summary,
      blockers: []
    };
  }

  return {
    status: 'ready',
    canPreview: true,
    message: `Preview pronto para o ambiente ${input.selectedEnvironment.name}.`,
    environment,
    workspace,
    summary,
    blockers: []
  };
}
