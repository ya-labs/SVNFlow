import { execFileSync } from 'child_process';

import { parsePatchFileOperations, type PatchFileOperations } from './git-patch.js';
import { applyPatch } from './patch-applier.js';
import { validatePatchFit, type ValidatePatchResult } from './patch-validator.js';
import { readPostApplyStatus, type PostApplyStatusResult } from './post-apply-status.js';
import { validateSvnCheckout } from './svn.js';
import { readSvnStatus, type SvnCheckoutState } from './svn-status.js';

export type ApplySourceKind = 'workspace' | 'package';

export interface ApplySourceDescription {
  kind: ApplySourceKind;
  label: string;
  packagePath?: string;
  packageId?: string;
}

export interface ApplyPlanInput {
  environmentName: string;
  svnCheckoutPath: string;
  patchContent: string;
  source: ApplySourceDescription;
}

export interface ApplyPlanBlocker {
  code: string;
  message: string;
}

export interface ApplyPlan {
  status: 'ready' | 'blocked';
  message: string;
  environment: {
    name: string;
    svnCheckoutPath: string;
  };
  source: ApplySourceDescription;
  files: PatchFileOperations;
  checkoutState: SvnCheckoutState;
  patchValidation?: ValidatePatchResult;
  warnings: string[];
  blockers: ApplyPlanBlocker[];
  canConfirm: boolean;
}

export interface ExecuteApplyInput extends ApplyPlanInput {
  confirmed: boolean;
}

export interface SvnSchedulingResult {
  added: string[];
  deleted: string[];
  errors: string[];
}

export interface ExecuteApplyResult {
  status: 'applied' | 'blocked' | 'error';
  message: string;
  plan: ApplyPlan;
  appliedFiles: string[];
  scheduling?: SvnSchedulingResult;
  postApply?: PostApplyStatusResult;
}

function emptyCheckoutState(message: string): SvnCheckoutState {
  return {
    status: 'blocked',
    message,
    files: [],
    hasConflicts: false,
    hasUnexpectedChanges: false
  };
}

export function buildApplyPlan(input: ApplyPlanInput): ApplyPlan {
  const files = parsePatchFileOperations(input.patchContent);
  const blockers: ApplyPlanBlocker[] = [];
  const warnings: string[] = [];
  const base = {
    environment: {
      name: input.environmentName,
      svnCheckoutPath: input.svnCheckoutPath
    },
    source: input.source,
    files
  };

  const checkoutValidation = validateSvnCheckout(input.svnCheckoutPath);

  if (!checkoutValidation.valid) {
    const message = `Checkout SVN inválido: ${checkoutValidation.message}`;

    return {
      ...base,
      status: 'blocked',
      message,
      checkoutState: emptyCheckoutState(message),
      warnings,
      blockers: [{ code: 'CHECKOUT_NOT_VALIDATED', message }],
      canConfirm: false
    };
  }

  if (!input.patchContent.trim() || files.added.length + files.modified.length + files.deleted.length === 0) {
    blockers.push({
      code: 'EMPTY_PATCH',
      message: 'Não há alteração técnica para aplicar. Gere um preview com alterações ou importe um pacote com patch.'
    });
  }

  const checkoutState = readSvnStatus({ checkoutPath: input.svnCheckoutPath });

  if (checkoutState.hasConflicts) {
    blockers.push({
      code: 'CHECKOUT_HAS_CONFLICTS',
      message: 'O checkout SVN possui conflitos. Resolva os conflitos antes de aplicar.'
    });
  } else if (checkoutState.status === 'blocked') {
    blockers.push({
      code: 'CHECKOUT_STATUS_UNAVAILABLE',
      message: checkoutState.message
    });
  } else if (checkoutState.files.length > 0) {
    warnings.push(
      `O checkout SVN já possui ${checkoutState.files.length} alteração(ões) local(is). Elas serão misturadas ao próximo commit SVN.`
    );
  }

  let patchValidation: ValidatePatchResult | undefined;

  if (blockers.length === 0) {
    patchValidation = validatePatchFit({
      checkoutPath: input.svnCheckoutPath,
      patchContent: input.patchContent
    });

    if (!patchValidation.canApply) {
      blockers.push({
        code: patchValidation.errorCode ?? 'PATCH_DOES_NOT_APPLY',
        message: patchValidation.message
      });
    }
  }

  if (blockers.length > 0) {
    return {
      ...base,
      status: 'blocked',
      message: blockers[0].message,
      checkoutState,
      patchValidation,
      warnings,
      blockers,
      canConfirm: false
    };
  }

  return {
    ...base,
    status: 'ready',
    message: 'Patch compatível com o checkout SVN. Revise os arquivos e confirme para aplicar. Nada será publicado no SVN.',
    checkoutState,
    patchValidation,
    warnings,
    blockers: [],
    canConfirm: true
  };
}

function runSvn(checkoutPath: string, args: string[]): void {
  execFileSync('svn', args, {
    cwd: checkoutPath,
    encoding: 'utf-8',
    timeout: 30000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

// O git apply altera apenas o disco; arquivos criados e removidos precisam ser
// agendados no SVN para entrarem no commit protegido.
export function scheduleSvnFileOperations(checkoutPath: string, files: PatchFileOperations): SvnSchedulingResult {
  const result: SvnSchedulingResult = { added: [], deleted: [], errors: [] };

  if (files.added.length > 0) {
    try {
      runSvn(checkoutPath, ['add', '--parents', '--force', '--', ...files.added]);
      result.added.push(...files.added);
    } catch (error) {
      result.errors.push(`Falha ao executar svn add: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }
  }

  if (files.deleted.length > 0) {
    try {
      runSvn(checkoutPath, ['delete', '--force', '--', ...files.deleted]);
      result.deleted.push(...files.deleted);
    } catch (error) {
      result.errors.push(`Falha ao executar svn delete: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }
  }

  return result;
}

export function executeApply(input: ExecuteApplyInput): ExecuteApplyResult {
  const plan = buildApplyPlan(input);

  if (!input.confirmed) {
    return {
      status: 'blocked',
      message: 'A aplicação requer confirmação explícita antes de prosseguir.',
      plan,
      appliedFiles: []
    };
  }

  if (!plan.canConfirm) {
    return {
      status: 'blocked',
      message: plan.message,
      plan,
      appliedFiles: []
    };
  }

  const apply = applyPatch({
    checkoutPath: input.svnCheckoutPath,
    patchContent: input.patchContent,
    patchValidated: true,
    checkoutValidated: true,
    confirmed: true
  });

  if (!apply.applied) {
    return {
      status: 'error',
      message: apply.message,
      plan,
      appliedFiles: []
    };
  }

  const appliedFiles = [...plan.files.added, ...plan.files.modified, ...plan.files.deleted];
  const scheduling = scheduleSvnFileOperations(input.svnCheckoutPath, plan.files);
  const postApply = readPostApplyStatus({
    checkoutPath: input.svnCheckoutPath,
    applyResult: { ...apply, affectedFiles: appliedFiles }
  });

  const message = scheduling.errors.length > 0
    ? `Patch aplicado, mas houve falha ao agendar arquivos no SVN. ${scheduling.errors[0]}`
    : postApply.message;

  return {
    status: scheduling.errors.length > 0 ? 'error' : 'applied',
    message,
    plan,
    appliedFiles,
    scheduling,
    postApply
  };
}
