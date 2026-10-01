import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

import { readUncommittedChanges } from './git-patch.js';
import { validateSvnCheckout } from './svn.js';
import { parseStatusXml } from './svn-xml.js';
import { svnLocalTarget } from './svn-path.js';

export interface SyncFileChange {
  path: string;
  kind: 'added' | 'modified' | 'deleted';
}

export interface SyncGitSource {
  branch?: string;
  commit: string;
  shortCommit: string;
  subject: string;
}

export interface SyncPendingChange {
  path: string;
  item: string;
}

export interface SyncFileDiff {
  path: string;
  kind: 'text' | 'binary' | 'directory' | 'empty' | 'too-large';
  source: 'git-vs-checkout' | 'svn-pending' | 'svn-revision';
  lines: string[];
  truncated: boolean;
}

export interface SyncPlan {
  status: 'ready' | 'up-to-date' | 'blocked';
  message: string;
  gitWorkspacePath: string;
  svnCheckoutPath: string;
  source?: SyncGitSource;
  changes: SyncFileChange[];
  totals: { added: number; modified: number; deleted: number };
  pendingSvnChanges: number;
  pending: SyncPendingChange[];
  warnings: string[];
  blockers: string[];
  canSync: boolean;
  // Regras do projeto: arquivos e pastas que não são copiados nem removidos no SVN.
  exclusions: string[];
}

export interface SyncPlanInput {
  gitWorkspacePath: string;
  svnCheckoutPath: string;
  exclusions?: string[];
}

// Metadados de checkout SVN versionados por engano no Git nunca são copiados:
// gravar dentro de .svn corrompe o checkout.
function isSvnMetadata(filePath: string): boolean {
  return filePath.split('/').includes('.svn');
}

export function isExcludedFromSync(filePath: string, exclusions: readonly string[] = []): boolean {
  return exclusions.some((rule) => filePath === rule || filePath.startsWith(`${rule}/`));
}

export interface ExecuteSyncResult {
  ok: boolean;
  message: string;
  plan: SyncPlan;
  errors: string[];
}

export interface SuggestCommitMessageInput {
  gitWorkspacePath: string;
  commit: string;
  lastSyncedCommit?: string;
}

interface GitTreeEntry {
  mode: string;
  sha: string;
}

interface SvnEntry {
  item: string;
}

const MAX_BUFFER = 256 * 1024 * 1024;
const SVN_ARGS_CHUNK = 200;

function git(gitWorkspacePath: string, args: string[], input?: Buffer): Buffer {
  return execFileSync('git', ['-C', gitWorkspacePath, ...args], {
    input,
    maxBuffer: MAX_BUFFER,
    timeout: 60000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function svn(svnCheckoutPath: string, args: string[]): string {
  return execFileSync('svn', args, {
    cwd: svnCheckoutPath,
    encoding: 'utf-8',
    maxBuffer: MAX_BUFFER,
    timeout: 120000,
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

export function readGitTree(gitWorkspacePath: string): Map<string, GitTreeEntry> {
  const output = git(gitWorkspacePath, ['ls-tree', '-r', '-z', '--full-tree', 'HEAD']).toString('utf-8');
  const entries = new Map<string, GitTreeEntry>();

  for (const record of output.split('\0')) {
    if (!record) {
      continue;
    }

    const tab = record.indexOf('\t');
    const [mode, type, sha] = record.slice(0, tab).split(' ');

    if (type === 'blob') {
      entries.set(record.slice(tab + 1), { mode, sha });
    } else {
      entries.set(record.slice(tab + 1), { mode, sha: '' });
    }
  }

  return entries;
}


// Lê os itens conhecidos pelo SVN no checkout, sem acessar o servidor.
export function readSvnEntries(svnCheckoutPath: string): Map<string, SvnEntry> {
  const xml = svn(svnCheckoutPath, ['status', '-v', '--xml', '.']);
  const entries = new Map<string, SvnEntry>();

  for (const entry of parseStatusXml(xml)) {
    const entryPath = entry.path.split(path.sep).join('/');

    if (entryPath !== '.') {
      entries.set(entryPath, { item: entry.item });
    }
  }

  return entries;
}

function gitBlobHash(content: Buffer): string {
  return createHash('sha1')
    .update(`blob ${content.length}\0`)
    .update(content)
    .digest('hex');
}

function isDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function readSource(gitWorkspacePath: string): SyncGitSource {
  const [commit, subject] = git(gitWorkspacePath, ['log', '-1', '--format=%H%x00%s', 'HEAD'])
    .toString('utf-8')
    .trim()
    .split('\0');
  const branch = git(gitWorkspacePath, ['branch', '--show-current']).toString('utf-8').trim();

  return {
    branch: branch || undefined,
    commit,
    shortCommit: commit.slice(0, 7),
    subject
  };
}

function parentDirectories(filePath: string): string[] {
  const parts = filePath.split('/');
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
}

function blockedPlan(input: SyncPlanInput, message: string, source?: SyncGitSource): SyncPlan {
  return {
    status: 'blocked',
    message,
    gitWorkspacePath: input.gitWorkspacePath,
    svnCheckoutPath: input.svnCheckoutPath,
    source,
    changes: [],
    totals: { added: 0, modified: 0, deleted: 0 },
    pendingSvnChanges: 0,
    pending: [],
    warnings: [],
    blockers: [message],
    canSync: false,
    exclusions: input.exclusions ?? []
  };
}

export function buildSyncPlan(input: SyncPlanInput): SyncPlan {
  const checkout = validateSvnCheckout(input.svnCheckoutPath);

  if (!checkout.valid) {
    return blockedPlan(input, `Checkout SVN inválido: ${checkout.message}`);
  }

  let source: SyncGitSource;
  let tree: Map<string, GitTreeEntry>;

  try {
    source = readSource(input.gitWorkspacePath);
    tree = readGitTree(input.gitWorkspacePath);
  } catch (error) {
    return blockedPlan(input, `Não foi possível ler o repositório Git: ${errorMessage(error)}`);
  }

  let svnEntries: Map<string, SvnEntry>;

  try {
    svnEntries = readSvnEntries(input.svnCheckoutPath);
  } catch (error) {
    return blockedPlan(input, `Não foi possível ler o estado do checkout SVN: ${errorMessage(error)}`, source);
  }

  const warnings: string[] = [];
  const blockers: string[] = [];
  const changes: SyncFileChange[] = [];
  const skipped: string[] = [];

  const conflicted = [...svnEntries].filter(([, entry]) => entry.item === 'conflicted' || entry.item === 'obstructed');
  if (conflicted.length > 0) {
    blockers.push(`O checkout SVN tem ${conflicted.length} item(ns) em conflito. Resolva com svn resolve antes de sincronizar.`);
  }

  const pending = [...svnEntries]
    .filter(([, entry]) => ['modified', 'added', 'deleted', 'replaced', 'missing'].includes(entry.item))
    // Pastas novas sobem junto com os arquivos; listar só arquivos deixa a revisão mais limpa.
    .filter(([entryPath, entry]) => !(entry.item === 'added' && isDirectory(path.join(input.svnCheckoutPath, entryPath))))
    .map(([entryPath, entry]) => ({ path: entryPath, item: entry.item }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const pendingSvnChanges = pending.length;

  const gitDirectories = new Set<string>();
  const exclusions = input.exclusions ?? [];
  let svnMetadata = 0;
  let excluded = 0;

  for (const [filePath, entry] of tree) {
    if (isSvnMetadata(filePath)) {
      svnMetadata += 1;
      continue;
    }

    if (isExcludedFromSync(filePath, exclusions)) {
      // A pasta continua existindo no Git: não pode ser removida do SVN.
      parentDirectories(filePath).forEach((directory) => gitDirectories.add(directory));
      excluded += 1;
      continue;
    }

    if (entry.mode === '160000' || entry.mode === '120000') {
      skipped.push(filePath);
      continue;
    }

    parentDirectories(filePath).forEach((directory) => gitDirectories.add(directory));

    const target = path.join(input.svnCheckoutPath, filePath);

    if (!existsSync(target) || isDirectory(target)) {
      changes.push({ path: filePath, kind: 'added' });
      continue;
    }

    if (gitBlobHash(readFileSync(target)) !== entry.sha) {
      changes.push({ path: filePath, kind: 'modified' });
    }
  }

  for (const [entryPath, entry] of svnEntries) {
    if (['unversioned', 'ignored', 'external', 'none', 'deleted'].includes(entry.item)) {
      continue;
    }

    if (tree.has(entryPath) || gitDirectories.has(entryPath) || isExcludedFromSync(entryPath, exclusions)) {
      continue;
    }

    // Inclui diretórios versionados que não existem mais no Git; o conteúdo sai junto.
    changes.push({ path: entryPath, kind: 'deleted' });
  }

  if (svnMetadata > 0) {
    warnings.push(`${svnMetadata} arquivo(s) de pastas .svn versionados no Git não são copiados (são metadados do checkout).`);
  }

  if (excluded > 0) {
    warnings.push(`${excluded} arquivo(s) do Git ficam fora da cópia pelas regras "Não copiar para o SVN" do projeto.`);
  }

  if (skipped.length > 0) {
    warnings.push(`${skipped.length} link(s) simbólico(s) ou submódulo(s) não são copiados: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '…' : ''}`);
  }

  const uncommitted = readUncommittedChanges(input.gitWorkspacePath);
  if (uncommitted.count > 0) {
    warnings.push(`${uncommitted.count} alteração(ões) não commitada(s) no Git ficam de fora. A sincronização usa o último commit (${source.shortCommit}).`);
  }

  const unversioned = [...svnEntries].filter(([entryPath, entry]) => entry.item === 'unversioned' && !tree.has(entryPath)).length;
  if (unversioned > 0) {
    warnings.push(`${unversioned} item(ns) não versionado(s) no checkout SVN que não existem no Git serão mantidos e não entram no commit.`);
  }

  changes.sort((a, b) => a.path.localeCompare(b.path));

  const totals = {
    added: changes.filter((change) => change.kind === 'added').length,
    modified: changes.filter((change) => change.kind === 'modified').length,
    deleted: changes.filter((change) => change.kind === 'deleted').length
  };
  const base = {
    gitWorkspacePath: input.gitWorkspacePath,
    svnCheckoutPath: input.svnCheckoutPath,
    source,
    changes,
    totals,
    pendingSvnChanges,
    pending,
    warnings,
    blockers,
    exclusions
  };

  if (blockers.length > 0) {
    return { ...base, status: 'blocked', message: blockers[0], canSync: false };
  }

  if (changes.length === 0) {
    return {
      ...base,
      status: 'up-to-date',
      message: pendingSvnChanges > 0
        ? `Os arquivos do checkout já estão iguais ao commit ${source.shortCommit}. Há ${pendingSvnChanges} alteração(ões) aguardando commit SVN.`
        : `O checkout SVN já está igual ao commit ${source.shortCommit}. Nada a sincronizar.`,
      canSync: false
    };
  }

  return {
    ...base,
    status: 'ready',
    message: `${changes.length} arquivo(s) diferem entre o commit ${source.shortCommit} e o checkout SVN.`,
    canSync: true
  };
}

// Lê vários blobs em uma única chamada ao git.
function readBlobs(gitWorkspacePath: string, shas: string[]): Map<string, Buffer> {
  const blobs = new Map<string, Buffer>();

  if (shas.length === 0) {
    return blobs;
  }

  const output = git(gitWorkspacePath, ['cat-file', '--batch'], Buffer.from(`${shas.join('\n')}\n`));
  let offset = 0;

  while (offset < output.length) {
    const headerEnd = output.indexOf(0x0a, offset);
    const [sha, , size] = output.subarray(offset, headerEnd).toString('utf-8').split(' ');
    const length = Number(size);
    const start = headerEnd + 1;

    blobs.set(sha, output.subarray(start, start + length));
    offset = start + length + 1;
  }

  return blobs;
}

function runInChunks(paths: string[], run: (chunk: string[]) => void): void {
  for (let index = 0; index < paths.length; index += SVN_ARGS_CHUNK) {
    run(paths.slice(index, index + SVN_ARGS_CHUNK));
  }
}

function topmostPaths(paths: string[]): string[] {
  const sorted = [...paths].sort();
  return sorted.filter((candidate) => !sorted.some((other) => other !== candidate && candidate.startsWith(`${other}/`)));
}

export function executeSync(input: SyncPlanInput & { confirmed: boolean }): ExecuteSyncResult {
  const plan = buildSyncPlan(input);

  if (!input.confirmed) {
    return { ok: false, message: 'A sincronização exige confirmação explícita.', plan, errors: [] };
  }

  if (!plan.canSync) {
    return { ok: false, message: plan.message, plan, errors: [] };
  }

  const errors: string[] = [];
  const tree = readGitTree(input.gitWorkspacePath);
  const toWrite = plan.changes.filter((change) => change.kind !== 'deleted');
  const blobs = readBlobs(input.gitWorkspacePath, [...new Set(toWrite.map((change) => tree.get(change.path)!.sha))]);

  for (const change of toWrite) {
    const entry = tree.get(change.path)!;
    const target = path.join(input.svnCheckoutPath, change.path);

    try {
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, blobs.get(entry.sha) ?? Buffer.alloc(0));

      if (entry.mode === '100755') {
        chmodSync(target, 0o755);
      }
    } catch (error) {
      errors.push(`Falha ao gravar ${change.path}: ${errorMessage(error)}`);
    }
  }

  const deleted = topmostPaths(plan.changes.filter((change) => change.kind === 'deleted').map((change) => change.path));

  try {
    runInChunks(deleted, (chunk) => svn(input.svnCheckoutPath, ['delete', '--force', '--', ...chunk.map(svnLocalTarget)]));
  } catch (error) {
    errors.push(`Falha ao executar svn delete: ${errorMessage(error)}`);
  }

  const added = plan.changes.filter((change) => change.kind === 'added').map((change) => change.path);

  try {
    runInChunks(added, (chunk) => svn(input.svnCheckoutPath, ['add', '--parents', '--force', '--', ...chunk.map(svnLocalTarget)]));
  } catch (error) {
    errors.push(`Falha ao executar svn add: ${errorMessage(error)}`);
  }

  return {
    ok: errors.length === 0,
    message: errors.length === 0
      ? `Checkout SVN atualizado com o commit ${plan.source?.shortCommit}: ${plan.totals.added} criado(s), ${plan.totals.modified} modificado(s), ${plan.totals.deleted} removido(s). Revise e faça o commit SVN.`
      : `Sincronização concluída com ${errors.length} erro(s). Revise o checkout antes do commit.`,
    plan,
    errors
  };
}

function readCommitSubjects(gitWorkspacePath: string, args: string[]): string[] {
  try {
    return git(gitWorkspacePath, ['log', '--format=%h %s', '--no-merges', ...args])
      .toString('utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function suggestSyncCommitMessage(input: SuggestCommitMessageInput): string {
  const shortCommit = input.commit.slice(0, 7);
  let subjects = input.lastSyncedCommit
    ? readCommitSubjects(input.gitWorkspacePath, [`${input.lastSyncedCommit}..${input.commit}`])
    : [];

  if (subjects.length === 0) {
    subjects = readCommitSubjects(input.gitWorkspacePath, ['-1', input.commit]);
  }

  if (subjects.length === 0) {
    return `Sincroniza com o commit Git ${shortCommit}`;
  }

  const firstSubject = subjects[0].slice(subjects[0].indexOf(' ') + 1);

  if (subjects.length === 1) {
    return `${firstSubject}\n\nGit: ${shortCommit}`;
  }

  return [
    `${firstSubject} (+${subjects.length - 1} commit(s))`,
    '',
    'Commits Git incluídos:',
    ...subjects.map((subject) => `- ${subject}`),
    '',
    `Git: ${shortCommit}`
  ].join('\n');
}

const MAX_DIFF_LINES = 4000;
export const MAX_DIFF_FILE_BYTES = 5 * 1024 * 1024;

function readGitBlob(gitWorkspacePath: string, filePath: string): Buffer | undefined {
  try {
    return git(gitWorkspacePath, ['cat-file', 'blob', `HEAD:${filePath}`]);
  } catch {
    return undefined;
  }
}

export function isBinary(content: Buffer): boolean {
  return content.subarray(0, 8000).includes(0);
}

function diffBuffers(oldContent: Buffer | undefined, newContent: Buffer | undefined): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'svnflow-diff-'));
  const oldPath = path.join(directory, 'antes');
  const newPath = path.join(directory, 'depois');

  try {
    writeFileSync(oldPath, oldContent ?? Buffer.alloc(0));
    writeFileSync(newPath, newContent ?? Buffer.alloc(0));

    try {
      execFileSync('git', ['diff', '--no-index', '--no-color', '--unified=3', oldPath, newPath], {
        encoding: 'utf-8',
        maxBuffer: MAX_BUFFER,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return '';
    } catch (error) {
      // git diff --no-index retorna 1 quando há diferença.
      return String((error as { stdout?: unknown }).stdout ?? '');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function toDiffResult(filePath: string, source: SyncFileDiff['source'], diff: string): SyncFileDiff {
  const start = diff.search(/^@@/m);
  const lines = start >= 0 ? diff.slice(start).replace(/\n$/, '').split('\n') : [];

  return {
    path: filePath,
    kind: lines.length > 0 ? 'text' : 'empty',
    source,
    lines: lines.slice(0, MAX_DIFF_LINES),
    truncated: lines.length > MAX_DIFF_LINES
  };
}

// Diff exibido na interface: Git x checkout enquanto há diferença; depois da
// cópia, mostra o que o commit SVN vai publicar (svn diff).
export function buildFileDiff(input: SyncPlanInput & { filePath: string }): SyncFileDiff {
  const target = path.join(input.svnCheckoutPath, input.filePath);
  const base = { path: input.filePath, lines: [], truncated: false };

  if (isDirectory(target)) {
    return { ...base, kind: 'directory', source: 'git-vs-checkout' };
  }

  const gitContent = readGitBlob(input.gitWorkspacePath, input.filePath);
  const diskContent = existsSync(target) ? readFileSync(target) : undefined;

  if ((gitContent?.length ?? 0) > MAX_DIFF_FILE_BYTES || (diskContent?.length ?? 0) > MAX_DIFF_FILE_BYTES) {
    return { ...base, kind: 'too-large', source: 'git-vs-checkout' };
  }

  const existsSomewhere = gitContent !== undefined || diskContent !== undefined;
  const differs = !gitContent || !diskContent || !gitContent.equals(diskContent);

  if (existsSomewhere && differs) {
    if ((gitContent && isBinary(gitContent)) || (diskContent && isBinary(diskContent))) {
      return { ...base, kind: 'binary', source: 'git-vs-checkout' };
    }

    const diff = diffBuffers(diskContent, gitContent);
    if (diff) {
      return toDiffResult(input.filePath, 'git-vs-checkout', diff);
    }
  }

  try {
    const svnDiff = svn(input.svnCheckoutPath, ['diff', '--', input.filePath]);

    if (/^Cannot display: file marked as a binary type/m.test(svnDiff)) {
      return { ...base, kind: 'binary', source: 'svn-pending' };
    }

    return toDiffResult(input.filePath, 'svn-pending', svnDiff);
  } catch {
    return { ...base, kind: 'empty', source: 'svn-pending' };
  }
}
