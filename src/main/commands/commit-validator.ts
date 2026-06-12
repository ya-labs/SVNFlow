import { readSvnStatus, type SvnCheckoutState } from './svn-status.js';

export type CommitPreValidationStatus = 'ready' | 'incompatible' | 'error';

export interface ValidateCommitInput {
  checkoutPath: string;
}

export interface CommitBlocker {
  code: string;
  message: string;
}

export interface ValidateCommitResult {
  status: CommitPreValidationStatus;
  canCommit: boolean;
  message: string;
  blockers: CommitBlocker[];
  hasChanges: boolean;
  affectedFilesCount: number;
  errorCode?: string;
}

function extractBlockersFromSvnStatus(svnState: SvnCheckoutState): CommitBlocker[] {
  const blockers: CommitBlocker[] = [];

  if (svnState.status === 'blocked') {
    blockers.push({
      code: 'SVN_CHECKOUT_BLOCKED',
      message: 'O checkout SVN não está em estado válido para operações.'
    });
    return blockers;
  }

  if (svnState.hasConflicts) {
    blockers.push({
      code: 'SVN_HAS_CONFLICTS',
      message: 'O checkout contém arquivos em conflito. Resolva os conflitos antes de fazer commit.'
    });
  }

  const missingFiles = svnState.files.filter((f) => f.status === 'missing');
  if (missingFiles.length > 0) {
    blockers.push({
      code: 'SVN_MISSING_FILES',
      message: `${missingFiles.length} arquivo(s) ausente(s) no disco. Restaure ou remova do versionamento.`
    });
  }

  const unversionedFiles = svnState.files.filter((f) => f.status === 'unversioned');
  if (unversionedFiles.length > 0) {
    blockers.push({
      code: 'SVN_UNVERSIONED_FILES_PRESENT',
      message: `${unversionedFiles.length} arquivo(s) não versionado(s) presentes. Versione ou ignore antes de fazer commit.`
    });
  }

  return blockers;
}

export function validateCommitPreConditions(input: ValidateCommitInput): ValidateCommitResult {
  try {
    const svnState = readSvnStatus({
      checkoutPath: input.checkoutPath
    });

    const blockers = extractBlockersFromSvnStatus(svnState);

    // Verificar se há alterações versionadas (M, A, D)
    const versionedChanges = svnState.files.filter(
      (f) => f.status === 'modified' || f.status === 'added' || f.status === 'deleted'
    );

    const hasChanges = versionedChanges.length > 0;

    if (!hasChanges && blockers.length === 0) {
      return {
        status: 'incompatible',
        canCommit: false,
        message: 'Nenhuma alteração versionada detectada no checkout SVN.',
        blockers: [
          {
            code: 'NO_CHANGES_TO_COMMIT',
            message: 'Não há mudanças para fazer commit.'
          }
        ],
        hasChanges: false,
        affectedFilesCount: 0,
        errorCode: 'NO_CHANGES_TO_COMMIT'
      };
    }

    if (blockers.length > 0) {
      return {
        status: 'incompatible',
        canCommit: false,
        message: 'O checkout SVN não está pronto para commit.',
        blockers,
        hasChanges,
        affectedFilesCount: versionedChanges.length,
        errorCode: 'PRECONDITIONS_NOT_MET'
      };
    }

    return {
      status: 'ready',
      canCommit: true,
      message: `Pronto para commit. ${versionedChanges.length} arquivo(s) alterado(s).`,
      blockers: [],
      hasChanges: true,
      affectedFilesCount: versionedChanges.length
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        status: 'error',
        canCommit: false,
        message: `Erro ao validar pré-condições de commit: ${error.message}`,
        blockers: [
          {
            code: 'VALIDATION_FAILED',
            message: error.message
          }
        ],
        hasChanges: false,
        affectedFilesCount: 0,
        errorCode: 'VALIDATION_FAILED'
      };
    }

    return {
      status: 'error',
      canCommit: false,
      message: 'Erro desconhecido ao validar pré-condições de commit.',
      blockers: [
        {
          code: 'UNKNOWN_ERROR',
          message: 'Erro desconhecido'
        }
      ],
      hasChanges: false,
      affectedFilesCount: 0,
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}
