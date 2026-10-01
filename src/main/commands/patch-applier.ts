import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

import { isolatedGitEnv } from './git-patch.js';

export type ApplyPatchStatus = 'applied' | 'blocked' | 'error';

export interface ApplyPatchInput {
  checkoutPath: string;
  patchContent: string;
  patchValidated: boolean;
  checkoutValidated: boolean;
  confirmed: boolean;
}

export interface ApplyPatchResult {
  status: ApplyPatchStatus;
  applied: boolean;
  message: string;
  affectedFiles?: string[];
  errorCode?: string;
}

function extractAffectedFiles(output: string): string[] {
  return output
    .split('\n')
    .filter((line) => line.startsWith('patching file '))
    .map((line) => line.replace('patching file ', '').trim());
}

export function applyPatch(input: ApplyPatchInput): ApplyPatchResult {
  if (!input.confirmed) {
    return {
      status: 'blocked',
      applied: false,
      message: 'A aplicação requer confirmação explícita antes de prosseguir.',
      errorCode: 'NOT_CONFIRMED'
    };
  }

  if (!input.checkoutValidated) {
    return {
      status: 'blocked',
      applied: false,
      message: 'O checkout SVN não foi validado. Valide o checkout antes de aplicar o patch.',
      errorCode: 'CHECKOUT_NOT_VALIDATED'
    };
  }

  if (!input.patchValidated) {
    return {
      status: 'blocked',
      applied: false,
      message: 'O patch não foi pré-validado. Execute a pré-validação antes de aplicar.',
      errorCode: 'PATCH_NOT_VALIDATED'
    };
  }

  const tmpPatchPath = join(tmpdir(), `svnflow-apply-${randomUUID()}.diff`);

  try {
    writeFileSync(tmpPatchPath, input.patchContent, { encoding: 'utf-8' });

    const output = execSync(`git apply "${tmpPatchPath}"`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: input.checkoutPath,
      env: isolatedGitEnv(input.checkoutPath)
    });

    const affectedFiles = extractAffectedFiles(output);

    return {
      status: 'applied',
      applied: true,
      message: 'Patch aplicado com sucesso no checkout SVN.',
      affectedFiles
    };
  } catch (error) {
    return {
      status: 'error',
      applied: false,
      message: `Erro durante a aplicação do patch: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      errorCode: 'APPLY_FAILED'
    };
  } finally {
    try {
      unlinkSync(tmpPatchPath);
    } catch {
      // arquivo temporário pode já ter sido removido
    }
  }
}
