import type { SelectedEnvironment } from './saved-environments';
import type { PreviewScreenState } from './preview-screen';
import type { PostApplyStatusResult } from './post-apply-status';
import { getYaLabsVisualProfile, getVisualMessageStyle } from './ya-labs-visual';

export type InterfaceOperationStatus = 'idle' | 'ready' | 'blocked' | 'error' | 'success';

export interface MainInterfaceState {
  visual: {
    profile: ReturnType<typeof getYaLabsVisualProfile>;
    messageStyles: {
      preview: ReturnType<typeof getVisualMessageStyle>;
      svnApply: ReturnType<typeof getVisualMessageStyle>;
    };
  };
  environment: {
    status: InterfaceOperationStatus;
    active?: {
      id: string;
      name: string;
      gitWorkspacePath: string;
      svnCheckoutPath: string;
    };
    message: string;
  };
  preview: {
    status: InterfaceOperationStatus;
    message: string;
    summary?: {
      totalAffectedFiles: number;
      hasBlockers: boolean;
      alertsCount: number;
    };
    blockers: string[];
    alerts: string[];
  };
  svnApply: {
    status: InterfaceOperationStatus;
    message: string;
    affectedFilesCount: number;
    hasConflicts: boolean;
  };
}

export interface BuildMainInterfaceStateInput {
  selectedEnvironment?: SelectedEnvironment;
  previewState?: PreviewScreenState;
  postApplyStatus?: PostApplyStatusResult;
}

function resolveEnvironmentState(selectedEnvironment?: SelectedEnvironment): MainInterfaceState['environment'] {
  if (!selectedEnvironment) {
    return {
      status: 'idle',
      message: 'Nenhum ambiente selecionado.'
    };
  }

  return {
    status: 'ready',
    active: {
      id: selectedEnvironment.id,
      name: selectedEnvironment.name,
      gitWorkspacePath: selectedEnvironment.gitWorkspacePath,
      svnCheckoutPath: selectedEnvironment.svnCheckoutPath
    },
    message: `Ambiente ativo: ${selectedEnvironment.name}`
  };
}

function resolvePreviewState(previewState?: PreviewScreenState): MainInterfaceState['preview'] {
  if (!previewState) {
    return {
      status: 'idle',
      message: 'Preview ainda não gerado.',
      blockers: [],
      alerts: []
    };
  }

  const blockers = previewState.blockers.map((b) => b.message);
  const alerts = previewState.alerts.map((a) => a.message);

  return {
    status: previewState.status === 'ready' ? 'ready' : 'blocked',
    message: previewState.message,
    summary: previewState.workspace
      ? {
          totalAffectedFiles: previewState.workspace.totalAffectedFiles,
          hasBlockers: blockers.length > 0,
          alertsCount: alerts.length
        }
      : undefined,
    blockers,
    alerts
  };
}

function resolveSvnApplyState(postApplyStatus?: PostApplyStatusResult): MainInterfaceState['svnApply'] {
  if (!postApplyStatus) {
    return {
      status: 'idle',
      message: 'Aplicação SVN ainda não executada.',
      affectedFilesCount: 0,
      hasConflicts: false
    };
  }

  if (postApplyStatus.reviewStatus === 'error') {
    return {
      status: 'error',
      message: postApplyStatus.message,
      affectedFilesCount: postApplyStatus.appliedFiles.length,
      hasConflicts: postApplyStatus.checkoutState.hasConflicts
    };
  }

  if (postApplyStatus.reviewStatus === 'requires-correction') {
    return {
      status: 'blocked',
      message: postApplyStatus.message,
      affectedFilesCount: postApplyStatus.appliedFiles.length,
      hasConflicts: postApplyStatus.checkoutState.hasConflicts
    };
  }

  return {
    status: 'success',
    message: postApplyStatus.message,
    affectedFilesCount: postApplyStatus.appliedFiles.length,
    hasConflicts: postApplyStatus.checkoutState.hasConflicts
  };
}

export function buildMainInterfaceState(input: BuildMainInterfaceStateInput): MainInterfaceState {
  const preview = resolvePreviewState(input.previewState);
  const svnApply = resolveSvnApplyState(input.postApplyStatus);

  const previewKind = preview.status === 'blocked'
    ? 'blocked'
    : preview.status === 'ready'
      ? 'success'
      : 'neutral';

  const svnApplyKind = svnApply.status === 'error'
    ? 'error'
    : svnApply.status === 'blocked'
      ? 'blocked'
      : svnApply.status === 'success'
        ? 'success'
        : 'neutral';

  return {
    visual: {
      profile: getYaLabsVisualProfile(),
      messageStyles: {
        preview: getVisualMessageStyle(previewKind),
        svnApply: getVisualMessageStyle(svnApplyKind)
      }
    },
    environment: resolveEnvironmentState(input.selectedEnvironment),
    preview,
    svnApply
  };
}
