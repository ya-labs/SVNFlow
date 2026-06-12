import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export type PatchValidationStatus = 'ready' | 'incompatible' | 'error';

export interface ValidatePatchInput {
  checkoutPath: string;
  patchContent: string;
}

export interface ValidatePatchResult {
  status: PatchValidationStatus;
  canApply: boolean;
  message: string;
  errorCode?: string;
}

export function validatePatchFit(input: ValidatePatchInput): ValidatePatchResult {
  const tmpPatchPath = join(tmpdir(), `svnflow-patch-${randomUUID()}.diff`);

  try {
    writeFileSync(tmpPatchPath, input.patchContent, { encoding: 'utf-8' });

    execSync(`git apply --check "${tmpPatchPath}"`, {
      encoding: 'utf-8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: input.checkoutPath
    });

    return {
      status: 'ready',
      canApply: true,
      message: 'Patch compatível com o checkout SVN. Pronto para aplicação.'
    };
  } catch (error) {
    if (error instanceof Error) {
      const stderr = ('stderr' in error ? String((error as NodeJS.ErrnoException & { stderr?: string }).stderr) : '').toLowerCase();
      const isIncompatible =
        stderr.includes('does not apply') ||
        stderr.includes('patch failed') ||
        stderr.includes('already applied');

      if (isIncompatible) {
        return {
          status: 'incompatible',
          canApply: false,
          message: 'O patch não encaixa no checkout SVN atual. Verifique se o checkout está sincronizado com a base correta.',
          errorCode: 'PATCH_DOES_NOT_APPLY'
        };
      }

      return {
        status: 'error',
        canApply: false,
        message: `Erro ao pré-validar o patch: ${error.message}`,
        errorCode: 'VALIDATION_FAILED'
      };
    }

    return {
      status: 'error',
      canApply: false,
      message: 'Erro desconhecido ao pré-validar o patch.',
      errorCode: 'UNKNOWN_ERROR'
    };
  } finally {
    try {
      unlinkSync(tmpPatchPath);
    } catch {
      // arquivo temporário pode já ter sido removido
    }
  }
}
