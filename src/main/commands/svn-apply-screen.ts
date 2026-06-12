import { readSvnStatus, type SvnCheckoutState } from './svn-status';
import { validatePatchFit, type ValidatePatchResult } from './patch-validator';
import { applyPatch, type ApplyPatchResult } from './patch-applier';

export interface SvnApplyConfirmationInput {
  environmentName: string;
  svnCheckoutPath: string;
  svnCheckoutValidated: boolean;
  patchContent: string;
  patchValidated: boolean;
  confirmed: boolean;
  rawStatusOutput?: string;
}

export interface SvnApplyConfirmationScreenState {
  status: 'ready' | 'blocked';
  title: string;
  message: string;
  designSystemReference: 'YA_LABS';
  environment: {
    name: string;
    svnCheckoutPath: string;
  };
  checkoutState: SvnCheckoutState;
  filesToBeChanged: string[];
  warnings: string[];
  blockers: Array<{
    code: string;
    message: string;
  }>;
  canConfirm: boolean;
  isApplyOperation: boolean;
  isCommitOperation: boolean;
}

function buildBlockers(input: SvnApplyConfirmationInput): Array<{ code: string; message: string }> {
  const blockers: Array<{ code: string; message: string }> = [];

  if (!input.svnCheckoutValidated) {
    blockers.push({
      code: 'CHECKOUT_NOT_VALIDATED',
      message: 'O checkout SVN não foi validado. Valide o checkout antes de prosseguir.'
    });
  }

  if (!input.patchValidated) {
    blockers.push({
      code: 'PATCH_NOT_VALIDATED',
      message: 'O patch não foi pré-validado. Execute a pré-validação antes de aplicar.'
    });
  }

  return blockers;
}

export function buildSvnApplyConfirmationScreen(
  input: SvnApplyConfirmationInput
): SvnApplyConfirmationScreenState {
  const blockers = buildBlockers(input);
  const checkoutState = readSvnStatus({
    checkoutPath: input.svnCheckoutPath,
    rawOutput: input.rawStatusOutput
  });

  if (checkoutState.hasConflicts) {
    blockers.push({
      code: 'CHECKOUT_HAS_CONFLICTS',
      message: 'O checkout SVN possui conflitos. Resolva os conflitos antes de aplicar.'
    });
  }

  const warnings: string[] = [];

  if (checkoutState.hasUnexpectedChanges) {
    warnings.push('O checkout SVN possui alterações locais inesperadas. Verifique antes de aplicar.');
  }

  const filesToBeChanged = checkoutState.files.map((f) => f.path);

  if (blockers.length > 0) {
    return {
      status: 'blocked',
      title: 'Aplicação no checkout SVN bloqueada',
      message: blockers[0].message,
      designSystemReference: 'YA_LABS',
      environment: {
        name: input.environmentName,
        svnCheckoutPath: input.svnCheckoutPath
      },
      checkoutState,
      filesToBeChanged,
      warnings,
      blockers,
      canConfirm: false,
      isApplyOperation: true,
      isCommitOperation: false
    };
  }

  return {
    status: 'ready',
    title: 'Confirmar aplicação no checkout SVN',
    message: 'Revise os arquivos que serão alterados. Esta operação modifica arquivos locais e não publica commit SVN.',
    designSystemReference: 'YA_LABS',
    environment: {
      name: input.environmentName,
      svnCheckoutPath: input.svnCheckoutPath
    },
    checkoutState,
    filesToBeChanged,
    warnings,
    blockers: [],
    canConfirm: true,
    isApplyOperation: true,
    isCommitOperation: false
  };
}

export interface ExecuteSvnApplyInput extends SvnApplyConfirmationInput {
  confirmed: boolean;
}

export interface ExecuteSvnApplyResult {
  apply: ApplyPatchResult;
  patchValidation: ValidatePatchResult;
}

export function executeSvnApply(input: ExecuteSvnApplyInput): ExecuteSvnApplyResult {
  const patchValidation = validatePatchFit({
    checkoutPath: input.svnCheckoutPath,
    patchContent: input.patchContent
  });

  const apply = applyPatch({
    checkoutPath: input.svnCheckoutPath,
    patchContent: input.patchContent,
    patchValidated: patchValidation.canApply,
    checkoutValidated: input.svnCheckoutValidated,
    confirmed: input.confirmed
  });

  return { apply, patchValidation };
}
