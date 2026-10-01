import { execFileSync } from 'child_process';
import { count } from './text.js';

export interface GitBranch {
  name: string;
  kind: 'local' | 'remote';
  shortCommit: string;
  committedAt?: string;
  upstream?: string;
}

export interface GitBranchList {
  ok: boolean;
  message: string;
  current?: string;
  detached: boolean;
  local: GitBranch[];
  remote: GitBranch[];
}

export interface SwitchGitBranchInput {
  gitRepositoryPath: string;
  branch: string;
  kind: 'local' | 'remote';
}

export interface SwitchGitBranchResult {
  ok: boolean;
  message: string;
  branch?: string;
  errorCode?: 'BRANCH_NOT_FOUND' | 'UNCOMMITTED_CHANGES' | 'SWITCH_FAILED';
  changedFiles?: string[];
}

function git(gitRepositoryPath: string, args: string[]): string {
  return execFileSync('git', ['-C', gitRepositoryPath, ...args], {
    encoding: 'utf-8',
    timeout: 30000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'stderr' in error) {
    const stderr = String((error as { stderr?: unknown }).stderr ?? '').trim();
    if (stderr) {
      return stderr;
    }
  }

  return error instanceof Error ? error.message : 'erro desconhecido';
}

export function listGitBranches(gitRepositoryPath: string): GitBranchList {
  try {
    const current = git(gitRepositoryPath, ['branch', '--show-current']).trim() || undefined;
    const output = git(gitRepositoryPath, [
      'for-each-ref',
      '--sort=-committerdate',
      '--format=%(refname)%00%(objectname:short)%00%(committerdate:iso-strict)%00%(upstream:short)',
      'refs/heads',
      'refs/remotes'
    ]);
    const local: GitBranch[] = [];
    const remote: GitBranch[] = [];

    for (const line of output.split('\n')) {
      if (!line) {
        continue;
      }

      const [ref, shortCommit, committedAt, upstream] = line.split('\0');

      if (ref.startsWith('refs/heads/')) {
        local.push({ name: ref.slice('refs/heads/'.length), kind: 'local', shortCommit, committedAt, upstream: upstream || undefined });
      } else if (ref.startsWith('refs/remotes/') && !ref.endsWith('/HEAD')) {
        remote.push({ name: ref.slice('refs/remotes/'.length), kind: 'remote', shortCommit, committedAt });
      }
    }

    // Branch remota que já tem cópia local aparece só na lista local.
    const tracked = new Set(local.map((branch) => branch.upstream).filter(Boolean));
    const localNames = new Set(local.map((branch) => branch.name));
    const remoteOnly = remote.filter((branch) => !tracked.has(branch.name) && !localNames.has(branch.name.slice(branch.name.indexOf('/') + 1)));

    return {
      ok: true,
      message: `${count(local.length, 'branch local', 'branches locais')}.`,
      current,
      detached: !current,
      local,
      remote: remoteOnly
    };
  } catch (error) {
    return {
      ok: false,
      message: `Não foi possível listar as branches: ${errorMessage(error)}`,
      detached: false,
      local: [],
      remote: []
    };
  }
}

export function switchGitBranch(input: SwitchGitBranchInput): SwitchGitBranchResult {
  const branches = listGitBranches(input.gitRepositoryPath);

  if (!branches.ok) {
    return { ok: false, message: branches.message, errorCode: 'SWITCH_FAILED' };
  }

  // Só aceita nomes que o próprio repositório listou.
  const candidates = input.kind === 'local' ? branches.local : branches.remote;
  const target = candidates.find((branch) => branch.name === input.branch);

  if (!target) {
    return { ok: false, message: `Branch ${input.branch} não encontrada no repositório.`, errorCode: 'BRANCH_NOT_FOUND' };
  }

  if (input.kind === 'local' && target.name === branches.current) {
    return { ok: true, message: `Já está na branch ${target.name}.`, branch: target.name };
  }

  const changedFiles = git(input.gitRepositoryPath, ['status', '--porcelain', '--untracked-files=no'])
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => line.slice(3).trim());

  if (changedFiles.length > 0) {
    return {
      ok: false,
      message: `Há ${count(changedFiles.length, 'alteração não commitada', 'alterações não commitadas')} no Git. Faça commit ou git stash antes de trocar de branch.`,
      errorCode: 'UNCOMMITTED_CHANGES',
      changedFiles
    };
  }

  try {
    const args = input.kind === 'local' ? ['switch', target.name] : ['switch', '--track', target.name];
    git(input.gitRepositoryPath, args);
    const branch = git(input.gitRepositoryPath, ['branch', '--show-current']).trim();

    return { ok: true, message: `Branch trocada para ${branch}.`, branch };
  } catch (error) {
    return { ok: false, message: `Não foi possível trocar de branch: ${errorMessage(error)}`, errorCode: 'SWITCH_FAILED' };
  }
}
