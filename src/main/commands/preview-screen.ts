import { buildPreviewContext, type PreviewAlert, type PreviewBlocker, type PreviewContextInput, type PreviewContextResult } from './preview';

export interface PreviewScreenActionState {
  canAdvance: boolean;
  reason?: string;
}

export interface PreviewScreenActions {
  canExportPackage: PreviewScreenActionState;
  canApplyInSvn: PreviewScreenActionState;
}

export interface PreviewScreenEnvironmentSection {
  environmentName: string;
  gitWorkspacePath: string;
  svnCheckoutPath: string;
  svnCheckoutRoot?: string;
}

export interface PreviewScreenWorkspaceSection {
  branch?: string;
  baseBranch: string;
  totalAffectedFiles: number;
  files: Array<{
    path: string;
    previousPath?: string;
    status: string;
    description: string;
    rawStatus: string;
  }>;
}

export interface PreviewScreenState {
  status: 'ready' | 'blocked';
  title: string;
  message: string;
  designSystemReference: 'YA_LABS';
  environment?: PreviewScreenEnvironmentSection;
  workspace?: PreviewScreenWorkspaceSection;
  blockers: PreviewBlocker[];
  alerts: PreviewAlert[];
  actions: PreviewScreenActions;
}

function normalizeBlockers(result: PreviewContextResult): PreviewBlocker[] {
  return result.blockers.map((blocker) => {
    if (typeof blocker === 'string') {
      return {
        code: blocker,
        message: 'Existe um bloqueio no preview. Verifique o ambiente para continuar.'
      };
    }

    return blocker;
  });
}

function createBlockedActions(reason: string): PreviewScreenActions {
  return {
    canExportPackage: {
      canAdvance: false,
      reason
    },
    canApplyInSvn: {
      canAdvance: false,
      reason
    }
  };
}

function createReadyActions(): PreviewScreenActions {
  return {
    canExportPackage: {
      canAdvance: true
    },
    canApplyInSvn: {
      canAdvance: true
    }
  };
}

export function buildPreviewScreenState(input: PreviewContextInput): PreviewScreenState {
  const preview = buildPreviewContext(input);
  const blockers = normalizeBlockers(preview);
  const alerts = preview.alerts ?? [];

  const environment = preview.environment
    ? {
        environmentName: preview.environment.name,
        gitWorkspacePath: preview.environment.gitWorkspacePath,
        svnCheckoutPath: preview.environment.svnCheckoutPath,
        svnCheckoutRoot: preview.environment.svnCheckoutRoot
      }
    : undefined;

  const workspace = preview.workspace
    ? {
        branch: preview.workspace.branch,
        baseBranch: preview.workspace.baseBranch,
        totalAffectedFiles: preview.workspace.changedFilesCount,
        files: preview.workspace.classifiedFiles.map((file) => ({
          path: file.path,
          previousPath: file.previousPath,
          status: file.humanReadableStatus,
          description: file.description,
          rawStatus: file.rawStatus
        }))
      }
    : undefined;

  if (preview.status !== 'ready' || blockers.length > 0 || !preview.summary?.hasSufficientChanges) {
    const reason = blockers[0]?.message ?? 'O preview ainda não está pronto para avançar.';

    return {
      status: 'blocked',
      title: 'Preview bloqueado',
      message: preview.message,
      designSystemReference: 'YA_LABS',
      environment,
      workspace,
      blockers,
      alerts,
      actions: createBlockedActions(reason)
    };
  }

  return {
    status: 'ready',
    title: 'Preview de alterações',
    message: preview.message,
    designSystemReference: 'YA_LABS',
    environment,
    workspace,
    blockers,
    alerts,
    actions: createReadyActions()
  };
}
