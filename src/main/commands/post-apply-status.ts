import { readSvnStatus, type SvnCheckoutState } from './svn-status.js';
import type { ApplyPatchResult } from './patch-applier.js';

export type PostApplyReviewStatus = 'ready-for-review' | 'requires-correction' | 'error';

export interface PostApplyStatusResult {
  reviewStatus: PostApplyReviewStatus;
  message: string;
  checkoutState: SvnCheckoutState;
  appliedFiles: string[];
  canAdvance: boolean;
}

export interface ReadPostApplyStatusInput {
  checkoutPath: string;
  applyResult: ApplyPatchResult;
  rawStatusOutput?: string;
}

export function readPostApplyStatus(input: ReadPostApplyStatusInput): PostApplyStatusResult {
  if (!input.applyResult.applied) {
    return {
      reviewStatus: 'error',
      message: 'A aplicação do patch não foi concluída. Não é possível exibir o estado pós-aplicação.',
      checkoutState: {
        status: 'blocked',
        message: 'Aplicação não realizada.',
        files: [],
        hasConflicts: false,
        hasUnexpectedChanges: false
      },
      appliedFiles: [],
      canAdvance: false
    };
  }

  const checkoutState = readSvnStatus({
    checkoutPath: input.checkoutPath,
    rawOutput: input.rawStatusOutput
  });

  const appliedFiles = input.applyResult.affectedFiles ?? [];

  if (checkoutState.hasConflicts) {
    return {
      reviewStatus: 'requires-correction',
      message: 'Conflitos detectados após aplicação. Revise e resolva os conflitos antes de prosseguir.',
      checkoutState,
      appliedFiles,
      canAdvance: false
    };
  }

  if (checkoutState.status === 'blocked') {
    return {
      reviewStatus: 'requires-correction',
      message: 'O checkout SVN está em estado bloqueante após a aplicação.',
      checkoutState,
      appliedFiles,
      canAdvance: false
    };
  }

  return {
    reviewStatus: 'ready-for-review',
    message: 'Patch aplicado. Revise as alterações antes de prosseguir para o commit SVN.',
    checkoutState,
    appliedFiles,
    canAdvance: true
  };
}
