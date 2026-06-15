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

function extractRevisionFromCommitOutput(output: string): string | undefined {
  const patterns = [
    /Committed revision\s+(\d+)\./i,
    /Revis[aã]o\s+(\d+)\s+(?:commitada|transmitida)\.?/i,
    /Revis[aã]o\s+(\d+)\.?/i,
    /revision\s+(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

function countChangedPathsInRevision(checkoutPath: string, revision: string): number | undefined {
  try {
    const logOutput = execSync(`svn log -v -r ${revision} "${checkoutPath}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Linhas de caminhos mudados no log detalhado seguem o padrão:
    // "   M /caminho" | "   A /caminho" | "   D /caminho" | "   R /caminho"
    const changedPaths = logOutput
      .split('\n')
      .filter((line) => /^\s+[AMDR]\s+\S+/.test(line));

    return changedPaths.length;
  } catch {
    return undefined;
  }
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

    const trackedChangesBeforeCommit = statusOutput
      .split('\n')
      .filter((line) => /^([AMDRC]|.[AMDRC])/.test(line)).length;

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
    let revision = extractRevisionFromCommitOutput(output);
    if (!revision) {
      // Fallback quando o cliente SVN localiza a mensagem de commit em formato inesperado
      // e não conseguimos extrair a revisão diretamente do output do commit.
      try {
        revision = execSync(`svn info --show-item revision "${checkoutPath}"`, {
          encoding: 'utf-8',
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
      } catch {
        revision = undefined;
      }
    }

    const filesCommitted = revision
      ? countChangedPathsInRevision(checkoutPath, revision) ?? trackedChangesBeforeCommit
      : trackedChangesBeforeCommit;

    return {
      status: 'success',
      message: revision
        ? `Commit realizado com sucesso na revisão ${revision}.`
        : 'Commit realizado com sucesso.',
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
