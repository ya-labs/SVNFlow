import { buildPreviewContext, type PreviewAlert, type PreviewBlocker, type PreviewContextInput, type PreviewContextResult } from './preview';

export interface PreviewMiniPrLocalDraft {
  title: string;
  context: string;
  whatChanged: string;
  notes: string;
}

export interface PreviewMiniPrLocalValidation {
  isValid: boolean;
  pendingRequiredFields: Array<'title' | 'context' | 'whatChanged'>;
}

export interface BuildPreviewScreenStateInput extends PreviewContextInput {
  miniPrLocalDraft?: Partial<PreviewMiniPrLocalDraft>;
}

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
  miniPrLocal: {
    draft: PreviewMiniPrLocalDraft;
    validation: PreviewMiniPrLocalValidation;
  };
  actions: PreviewScreenActions;
}

function normalizeMiniPrLocalDraft(draft?: Partial<PreviewMiniPrLocalDraft>): PreviewMiniPrLocalDraft {
  return {
    title: draft?.title?.trim() ?? '',
    context: draft?.context?.trim() ?? '',
    whatChanged: draft?.whatChanged?.trim() ?? '',
    notes: draft?.notes?.trim() ?? ''
  };
}

function validateMiniPrLocalDraft(draft: PreviewMiniPrLocalDraft): PreviewMiniPrLocalValidation {
  const pendingRequiredFields: Array<'title' | 'context' | 'whatChanged'> = [];

  if (!draft.title) {
    pendingRequiredFields.push('title');
  }

  if (!draft.context) {
    pendingRequiredFields.push('context');
  }

  if (!draft.whatChanged) {
    pendingRequiredFields.push('whatChanged');
  }

  return {
    isValid: pendingRequiredFields.length === 0,
    pendingRequiredFields
  };
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

export function buildPreviewScreenState(input: BuildPreviewScreenStateInput): PreviewScreenState {
  const preview = buildPreviewContext(input);
  const blockers = normalizeBlockers(preview);
  const alerts = preview.alerts ?? [];
  const miniPrLocalDraft = normalizeMiniPrLocalDraft(input.miniPrLocalDraft);
  const miniPrLocalValidation = validateMiniPrLocalDraft(miniPrLocalDraft);

  if (!miniPrLocalValidation.isValid) {
    blockers.push({
      code: 'MINI_PR_REQUIRED_FIELDS',
      message: 'Preencha título, contexto e o que mudou para continuar.',
      affectedFiles: miniPrLocalValidation.pendingRequiredFields
    });
  }

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
      miniPrLocal: {
        draft: miniPrLocalDraft,
        validation: miniPrLocalValidation
      },
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
    miniPrLocal: {
      draft: miniPrLocalDraft,
      validation: miniPrLocalValidation
    },
    actions: createReadyActions()
  };
}
