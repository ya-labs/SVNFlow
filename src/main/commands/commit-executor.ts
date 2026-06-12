import { execSync } from 'child_process';

export type CommitExecutionStatus = 'success' | 'failed' | 'cancelled' | 'conflict';

export interface ExecuteCommitInput {
  checkoutPath: string;
  title: string;
  description?: string;
}

export interface CommitConflict {
  file: string;
  reason: string;
}

export interface ExecuteCommitResult {
  status: CommitExecutionStatus;
  message: string;
  revision?: string;
  filesCommitted?: number;
  conflicts?: CommitConflict[];
  errorCode?: string;
  error?: string;
}

export function executeCommit(input: ExecuteCommitInput): ExecuteCommitResult {
  const { checkoutPath, title, description } = input;

  // Construir mensagem de commit
  let commitMessage = title;
  if (description && description.trim()) {
    commitMessage = `${title}\n\n${description}`;
  }

  try {
    // Verificar se há mudanças para fazer commit
    let statusOutput: string;
    try {
      statusOutput = execSync(`svn status "${checkoutPath}"`, {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch (error) {
      return {
        status: 'failed',
        message: 'Erro ao verificar status do checkout SVN.',
        errorCode: 'SVN_STATUS_FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    if (!statusOutput) {
      return {
        status: 'cancelled',
        message: 'Nenhuma mudança para fazer commit.',
        filesCommitted: 0
      };
    }

    // Executar svn commit com a mensagem
    let output: string;
    try {
      output = execSync(
        `svn commit "${checkoutPath}" -m "${commitMessage.replace(/"/g, '\\"')}"`,
        {
          encoding: 'utf-8',
          timeout: 30000,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );
    } catch (error) {
      // Verificar se é erro de conflito
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';

      if (errorMsg.includes('conflict')) {
        return {
          status: 'conflict',
          message: 'Conflito durante o commit. Verifique o status do checkout.',
          errorCode: 'SVN_COMMIT_CONFLICT',
          error: errorMsg
        };
      }

      return {
        status: 'failed',
        message: 'Erro ao executar svn commit.',
        errorCode: 'SVN_COMMIT_FAILED',
        error: errorMsg
      };
    }

    // Extrair número de revisão e arquivos commitados da saída
    const revisionMatch = output.match(/Committed revision (\d+)\./);
    const revision = revisionMatch ? revisionMatch[1] : undefined;

    // Contar linhas de mudanças (primeira letra da linha é o status)
    const changedLines = output.split('\n').filter((line) => /^[AMDRC]/.test(line));
    const filesCommitted = changedLines.length;

    return {
      status: 'success',
      message: `Commit realizado com sucesso na revisão ${revision}.`,
      revision,
      filesCommitted
    };
  } catch (error) {
    return {
      status: 'failed',
      message: 'Erro inesperado ao executar commit SVN.',
      errorCode: 'UNKNOWN_ERROR',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
