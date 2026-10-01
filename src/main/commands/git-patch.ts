import { execFileSync } from 'child_process';
import { dirname } from 'path';

export interface GeneratePatchInput {
  gitRepositoryPath: string;
  baseBranch: string;
}

export interface GeneratePatchResult {
  ok: boolean;
  message: string;
  patchContent: string;
  errorCode?: 'PATCH_GENERATION_FAILED' | 'EMPTY_PATCH';
}

export interface PatchFileOperations {
  added: string[];
  deleted: string[];
  modified: string[];
}

export interface UncommittedChangesResult {
  count: number;
  files: string[];
}

// Impede o git de descobrir um repositório acima do checkout SVN, o que faria
// os caminhos do patch serem resolvidos a partir de outra raiz.
export function isolatedGitEnv(checkoutPath: string): NodeJS.ProcessEnv {
  return { ...process.env, GIT_CEILING_DIRECTORIES: dirname(checkoutPath) };
}

const MAX_PATCH_BUFFER = 64 * 1024 * 1024;

// O patch é gerado sem detecção de renomeação para que a aplicação no SVN
// trate cada arquivo como criação, remoção ou modificação simples.
export function generateGitPatch(input: GeneratePatchInput): GeneratePatchResult {
  try {
    const patchContent = execFileSync(
      'git',
      ['-C', input.gitRepositoryPath, 'diff', '--binary', '--no-renames', '--no-color', `${input.baseBranch}...HEAD`],
      {
        encoding: 'utf-8',
        timeout: 30000,
        maxBuffer: MAX_PATCH_BUFFER,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );

    if (!patchContent.trim()) {
      return {
        ok: false,
        message: `Nenhuma diferença encontrada entre ${input.baseBranch} e a branch atual.`,
        patchContent: '',
        errorCode: 'EMPTY_PATCH'
      };
    }

    return {
      ok: true,
      message: 'Patch gerado a partir do workspace Git.',
      patchContent
    };
  } catch (error) {
    return {
      ok: false,
      message: `Falha ao gerar patch do workspace Git: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      patchContent: '',
      errorCode: 'PATCH_GENERATION_FAILED'
    };
  }
}

function unquoteGitPath(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return JSON.parse(trimmed) as string;
  }

  return trimmed;
}

function readHeaderPath(line: string, prefix: 'a/' | 'b/'): string | undefined {
  const value = unquoteGitPath(line.slice(4));

  if (value === '/dev/null') {
    return undefined;
  }

  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function readDiffGitPath(line: string): string | undefined {
  const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
  return match?.[2];
}

export function parsePatchFileOperations(patchContent: string): PatchFileOperations {
  const operations: PatchFileOperations = { added: [], deleted: [], modified: [] };
  const blocks = patchContent.split(/^(?=diff --git )/m).filter((block) => block.startsWith('diff --git '));

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const isNew = lines.some((line) => line.startsWith('new file mode'));
    const isDeleted = lines.some((line) => line.startsWith('deleted file mode'));
    const oldPath = lines.find((line) => line.startsWith('--- '));
    const newPath = lines.find((line) => line.startsWith('+++ '));
    const filePath = isDeleted
      ? (oldPath ? readHeaderPath(oldPath, 'a/') : undefined) ?? readDiffGitPath(lines[0])
      : (newPath ? readHeaderPath(newPath, 'b/') : undefined) ?? readDiffGitPath(lines[0]);

    if (!filePath) {
      continue;
    }

    if (isNew) {
      operations.added.push(filePath);
    } else if (isDeleted) {
      operations.deleted.push(filePath);
    } else {
      operations.modified.push(filePath);
    }
  }

  return operations;
}

export function listPatchFiles(operations: PatchFileOperations): string[] {
  return [...operations.added, ...operations.modified, ...operations.deleted];
}

export function readUncommittedChanges(gitRepositoryPath: string): UncommittedChangesResult {
  try {
    const output = execFileSync('git', ['-C', gitRepositoryPath, 'status', '--porcelain'], {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const files = output
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.slice(3).trim());

    return { count: files.length, files };
  } catch {
    return { count: 0, files: [] };
  }
}

export function readGitAuthor(gitRepositoryPath: string): string | undefined {
  try {
    const name = execFileSync('git', ['-C', gitRepositoryPath, 'config', 'user.name'], {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    return name.length > 0 ? name : undefined;
  } catch {
    return undefined;
  }
}
