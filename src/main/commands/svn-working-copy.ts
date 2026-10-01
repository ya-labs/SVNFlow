import { copyFile, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { isBinary, MAX_DIFF_FILE_BYTES, toDiffResult, type SyncFileDiff } from './git-svn-sync.js';
import { svnErrorDetail, type SvnCredentials, type SvnErrorCode } from './svn-client.js';
import { runSvnInSession } from './svn-session.js';
import { svnLocalTarget } from './svn-path.js';
import { parseInfoXml, parseStatusXml } from './svn-xml.js';

export type WorkingCopyKind = 'modified' | 'added' | 'deleted' | 'missing' | 'unversioned' | 'conflicted' | 'replaced' | 'obstructed';

export interface WorkingCopyChange {
  path: string;
  kind: WorkingCopyKind;
  isDirectory: boolean;
  // Só as propriedades mudaram (ex.: svn:ignore da pasta).
  propertiesOnly: boolean;
  // No changelist ignore-on-commit (mesma convenção do TortoiseSVN).
  ignoredOnCommit: boolean;
  selectable: boolean;
  defaultSelected: boolean;
}

export const IGNORE_ON_COMMIT = 'ignore-on-commit';

export interface WorkingCopyStatus {
  ok: boolean;
  message: string;
  url?: string;
  revision?: string;
  changes: WorkingCopyChange[];
  conflicts: number;
  detail?: string;
  errorCode?: SvnErrorCode;
}

export interface WorkingCopyOptions {
  credentials?: SvnCredentials;
  configDir?: string;
}

export interface CommitSelectedInput extends WorkingCopyOptions {
  checkoutPath: string;
  paths: string[];
  message: string;
}

export interface CommitSelectedResult {
  ok: boolean;
  message: string;
  revision?: string;
  committed: string[];
  detail?: string;
  errorCode?: SvnErrorCode | 'NOTHING_SELECTED' | 'INVALID_SELECTION' | 'EMPTY_MESSAGE' | 'CONFLICT_SELECTED';
}

const KNOWN_KINDS = new Set<WorkingCopyKind>(['modified', 'added', 'deleted', 'missing', 'unversioned', 'conflicted', 'replaced', 'obstructed']);

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

function isConflictArtifact(candidate: string, conflictPath: string): boolean {
  if (!candidate.startsWith(`${conflictPath}.`)) {
    return false;
  }

  return /^(mine|working|r\d+|merge-(left|right)\.r\d+)$/.test(candidate.slice(conflictPath.length + 1));
}

function isUnder(candidate: string, parent: string): boolean {
  return candidate.startsWith(`${parent}/`);
}

async function readRawStatus(checkoutPath: string, options: WorkingCopyOptions, url?: string) {
  return runSvnInSession(['status', '--xml', '.'], { cwd: checkoutPath, url, configDir: options.configDir, credentials: options.credentials });
}

export async function readWorkingCopyStatus(checkoutPath: string, options: WorkingCopyOptions = {}): Promise<WorkingCopyStatus> {
  const infoResult = await runSvnInSession(['info', '--xml', '.'], { cwd: checkoutPath, configDir: options.configDir });

  if (!infoResult.ok) {
    return { ok: false, message: infoResult.message, detail: svnErrorDetail(infoResult.stderr), errorCode: infoResult.errorCode, changes: [], conflicts: 0 };
  }

  const info = parseInfoXml(infoResult.stdout);
  const statusResult = await readRawStatus(checkoutPath, options, info.url);

  if (!statusResult.ok) {
    return { ok: false, message: statusResult.message, detail: svnErrorDetail(statusResult.stderr), errorCode: statusResult.errorCode, changes: [], conflicts: 0 };
  }

  const collected: WorkingCopyChange[] = [];

  for (const entry of parseStatusXml(statusResult.stdout)) {
    const relative = toPosix(entry.path);
    const propertiesOnly = entry.item === 'normal' && entry.props === 'modified';
    const kind = (entry.props === 'conflicted' ? 'conflicted' : propertiesOnly ? 'modified' : entry.item) as WorkingCopyKind;

    if ((relative === '.' && !propertiesOnly) || !KNOWN_KINDS.has(kind)) {
      continue;
    }

    const directory = await isDirectory(path.join(checkoutPath, relative));

    // Pastas adicionadas sobem junto com os arquivos selecionados dentro delas.
    if (kind === 'added' && directory) {
      continue;
    }

    const ignoredOnCommit = entry.changelist === IGNORE_ON_COMMIT;

    collected.push({
      path: relative,
      kind,
      isDirectory: directory,
      propertiesOnly,
      ignoredOnCommit,
      selectable: kind !== 'conflicted' && kind !== 'obstructed',
      defaultSelected: !ignoredOnCommit && kind !== 'unversioned' && kind !== 'conflicted' && kind !== 'obstructed'
    });
  }

  // Arquivos auxiliares que o SVN cria num conflito (.mine, .rN, .working…)
  // somem com svn resolve e não devem ser oferecidos para commit.
  const conflicted = collected.filter((change) => change.kind === 'conflicted').map((change) => change.path);
  const changes = collected
    .filter((change) => !(change.kind === 'unversioned' && conflicted.some((conflictPath) => isConflictArtifact(change.path, conflictPath))))
    .sort((a, b) => Number(a.ignoredOnCommit) - Number(b.ignoredOnCommit) || a.path.localeCompare(b.path));
  const conflicts = conflicted.length;

  return {
    ok: true,
    url: info.url,
    revision: info.revision,
    changes,
    conflicts,
    message: changes.length === 0
      ? 'Nenhuma alteração local no checkout SVN.'
      : `${changes.length} alteração(ões) local(is) no checkout SVN.`
  };
}

export async function readWorkingCopyDiff(checkoutPath: string, filePath: string): Promise<SyncFileDiff> {
  const base = { path: filePath, lines: [] as string[], truncated: false, source: 'svn-pending' as const };
  const target = path.join(checkoutPath, filePath);

  if (await isDirectory(target)) {
    // Pasta com propriedades alteradas (ex.: svn:ignore): mostra a mudança da propriedade.
    const propertyDiff = await runSvnInSession(['diff', '--depth', 'empty', '--', filePath], { cwd: checkoutPath });
    const start = propertyDiff.ok ? propertyDiff.stdout.search(/^Property changes on:/m) : -1;

    if (start < 0) {
      return { ...base, kind: 'directory' };
    }

    const lines = propertyDiff.stdout.slice(start).replace(/\n$/, '').split('\n')
      .filter((line) => !/^(Property changes on:|_{5,})/.test(line))
      .map((line) => line.replace(/^## (.+) ##$/, '@@ $1 @@').replace(/^(Added|Modified|Deleted): (.+)$/, '\\ Propriedade $2'));

    return { ...base, kind: 'text', lines };
  }

  const status = await runSvnInSession(['status', '--xml', '--', svnLocalTarget(filePath)], { cwd: checkoutPath });
  const item = status.ok ? parseStatusXml(status.stdout)[0]?.item : undefined;

  // Arquivo novo fora do SVN: mostra o conteúdo inteiro como adição.
  if (item === 'unversioned') {
    try {
      const content = await readFile(target);

      if (content.length > MAX_DIFF_FILE_BYTES) {
        return { ...base, kind: 'too-large' };
      }

      if (isBinary(content)) {
        return { ...base, kind: 'binary' };
      }

      const lines = content.toString('utf-8').replace(/\n$/, '').split('\n');
      return toDiffResult(filePath, 'svn-pending', `@@ -0,0 +1,${lines.length} @@\n${lines.map((line) => `+${line}`).join('\n')}\n`);
    } catch {
      return { ...base, kind: 'empty' };
    }
  }

  // O diff de um único alvo local usa o nome literal, sem separar peg revision.
  const diff = await runSvnInSession(['diff', '--', filePath], { cwd: checkoutPath });

  if (!diff.ok) {
    return { ...base, kind: 'empty' };
  }

  if (/^Cannot display: file marked as a binary type/m.test(diff.stdout)) {
    return { ...base, kind: 'binary' };
  }

  return toDiffResult(filePath, 'svn-pending', diff.stdout);
}

export async function commitSelected(input: CommitSelectedInput): Promise<CommitSelectedResult> {
  const message = input.message.trim();
  const base = { committed: [] as string[] };

  if (!message) {
    return { ...base, ok: false, message: 'Informe a mensagem do commit SVN.', errorCode: 'EMPTY_MESSAGE' };
  }

  if (input.paths.length === 0) {
    return { ...base, ok: false, message: 'Selecione pelo menos um arquivo para commitar.', errorCode: 'NOTHING_SELECTED' };
  }

  const before = await readWorkingCopyStatus(input.checkoutPath, input);

  if (!before.ok) {
    return { ...base, ok: false, message: before.message, detail: before.detail, errorCode: before.errorCode };
  }

  // Só aceita caminhos que o próprio svn status listou.
  const byPath = new Map(before.changes.map((change) => [change.path, change]));
  const selected = [...new Set(input.paths)].map((item) => byPath.get(item));

  if (selected.some((change) => !change)) {
    return { ...base, ok: false, message: 'A seleção mudou. Atualize a lista de alterações e tente de novo.', errorCode: 'INVALID_SELECTION' };
  }

  const changes = selected as WorkingCopyChange[];

  if (changes.some((change) => !change.selectable)) {
    return { ...base, ok: false, message: 'Arquivos em conflito não podem ser commitados. Resolva os conflitos antes.', errorCode: 'CONFLICT_SELECTED' };
  }

  const session = { cwd: input.checkoutPath, url: before.url, credentials: input.credentials, configDir: input.configDir };
  const toAdd = changes.filter((change) => change.kind === 'unversioned').map((change) => change.path);
  const toDelete = changes.filter((change) => change.kind === 'missing').map((change) => change.path);

  if (toAdd.length > 0) {
    const added = await runSvnInSession(['add', '--parents', '--force', '--', ...toAdd.map(svnLocalTarget)], session);
    if (!added.ok) {
      return { ...base, ok: false, message: `Falha ao adicionar arquivos novos: ${added.message}`, detail: svnErrorDetail(added.stderr), errorCode: added.errorCode };
    }
  }

  if (toDelete.length > 0) {
    const deleted = await runSvnInSession(['delete', '--force', '--', ...toDelete.map(svnLocalTarget)], session);
    if (!deleted.ok) {
      return { ...base, ok: false, message: `Falha ao remover arquivos ausentes: ${deleted.message}`, detail: svnErrorDetail(deleted.stderr), errorCode: deleted.errorCode };
    }
  }

  // Lista explícita com --depth empty: uma pasta nos alvos não arrasta junto
  // alterações que a pessoa não marcou.
  const after = await readRawStatus(input.checkoutPath, input, before.url);
  const statusEntries = after.ok ? parseStatusXml(after.stdout).map((entry) => ({ path: toPosix(entry.path), item: entry.item })) : [];
  const roots = changes.map((change) => change.path);
  const expanded = new Set<string>(roots);

  for (const entry of statusEntries) {
    if (roots.some((root) => isUnder(entry.path, root)) && ['added', 'deleted', 'modified', 'replaced'].includes(entry.item)) {
      expanded.add(entry.path);
    }
  }

  const addedDirectories = new Set(statusEntries.filter((entry) => entry.item === 'added').map((entry) => entry.path));

  for (const target of [...expanded]) {
    const parts = target.split('/');
    for (let index = 1; index < parts.length; index += 1) {
      const parent = parts.slice(0, index).join('/');
      if (addedDirectories.has(parent)) {
        expanded.add(parent);
      }
    }
  }

  const targets = [...expanded].sort();

  // Mudança de propriedade de pasta (ex.: svn:ignore) só commita com a pasta na
  // revisão mais nova; --depth empty atualiza a pasta sem mexer nos arquivos dela.
  for (const change of changes.filter((item) => item.propertiesOnly)) {
    const refreshed = await runSvnInSession(['update', '--depth', 'empty', '--accept', 'postpone', '--', svnLocalTarget(change.path)], session);
    const conflicted = refreshed.ok && /^.C|^C/m.test(refreshed.stdout);

    if (!refreshed.ok || conflicted) {
      return {
        ...base,
        ok: false,
        message: conflicted
          ? `As propriedades de ${change.path === '.' ? 'raiz do projeto' : change.path} mudaram no servidor também e ficaram em conflito. Resolva antes de commitar.`
          : `Não foi possível atualizar ${change.path} antes do commit: ${refreshed.message}`,
        detail: svnErrorDetail(refreshed.stderr),
        errorCode: conflicted ? 'CONFLICT_SELECTED' : refreshed.errorCode
      };
    }
  }
  // --keep-changelists: um arquivo "ignorado no commit" que a pessoa decidiu publicar continua marcado como ignorado.
  const result = await runSvnInSession(['commit', '--depth', 'empty', '--keep-changelists', '-m', message, '--', ...targets.map(svnLocalTarget)], { ...session, timeoutMs: 10 * 60 * 1000 });

  if (!result.ok) {
    const outOfDate = result.errorCode === 'OUT_OF_DATE';
    return {
      ...base,
      ok: false,
      message: outOfDate ? 'O checkout está desatualizado em relação ao servidor. Use Atualizar antes de commitar.' : result.message,
      detail: svnErrorDetail(result.stderr),
      errorCode: result.errorCode
    };
  }

  const revision = result.stdout.match(/Committed revision (\d+)\./)?.[1];

  return {
    ok: true,
    revision,
    committed: targets,
    message: revision ? `Revisão ${revision} publicada no SVN com ${targets.length} caminho(s).` : 'Commit concluído.'
  };
}

export interface IncomingResult {
  ok: boolean;
  message: string;
  incoming: number;
  workingCopyRevision?: string;
  headRevision?: string;
  errorCode?: SvnErrorCode;
}

export interface UpdateResult {
  ok: boolean;
  message: string;
  revision?: string;
  updated: Array<{ action: string; path: string }>;
  conflicts: string[];
  detail?: string;
  errorCode?: SvnErrorCode | 'HAS_CONFLICTS';
}

// Quantas revisões do servidor mexeram no projeto depois da revisão do checkout.
export async function countIncoming(checkoutPath: string, options: WorkingCopyOptions = {}): Promise<IncomingResult> {
  const local = await runSvnInSession(['info', '--xml', '.'], { cwd: checkoutPath, configDir: options.configDir });

  if (!local.ok) {
    return { ok: false, message: local.message, incoming: 0, errorCode: local.errorCode };
  }

  const info = parseInfoXml(local.stdout);

  if (!info.url || !info.revision) {
    return { ok: false, message: 'Não foi possível ler a revisão do checkout.', incoming: 0 };
  }

  const session = { url: info.url, credentials: options.credentials, configDir: options.configDir, timeoutMs: 60000 };
  const remote = await runSvnInSession(['info', '--xml', info.url], session);

  if (!remote.ok) {
    return { ok: false, message: remote.message, incoming: 0, workingCopyRevision: info.revision, errorCode: remote.errorCode };
  }

  const remoteInfo = parseInfoXml(remote.stdout);
  const lastChanged = Number(remoteInfo.lastChangedRevision ?? 0);
  const base = { ok: true, workingCopyRevision: info.revision, headRevision: remoteInfo.revision };

  if (lastChanged <= Number(info.revision)) {
    return { ...base, incoming: 0, message: 'O checkout está atualizado com o servidor.' };
  }

  const log = await runSvnInSession(['log', '-q', '-r', `${Number(info.revision) + 1}:HEAD`, info.url], session);

  if (!log.ok) {
    return { ok: false, message: log.message, incoming: 0, workingCopyRevision: info.revision, errorCode: log.errorCode };
  }

  const incoming = log.stdout.split('\n').filter((line) => /^r\d+ \|/.test(line)).length;

  return { ...base, incoming, message: `${incoming} revisão(ões) nova(s) no servidor.` };
}

export async function updateWorkingCopy(checkoutPath: string, options: WorkingCopyOptions = {}): Promise<UpdateResult> {
  const before = await readWorkingCopyStatus(checkoutPath, options);

  if (!before.ok) {
    return { ok: false, message: before.message, updated: [], conflicts: [], detail: before.detail, errorCode: before.errorCode };
  }

  if (before.conflicts > 0) {
    return { ok: false, message: 'Resolva os conflitos do checkout antes de atualizar.', updated: [], conflicts: [], errorCode: 'HAS_CONFLICTS' };
  }

  // --accept postpone: conflitos ficam marcados para a pessoa resolver; nada é escolhido automaticamente.
  const result = await runSvnInSession(['update', '--accept', 'postpone', '.'], {
    cwd: checkoutPath,
    url: before.url,
    credentials: options.credentials,
    configDir: options.configDir,
    timeoutMs: 10 * 60 * 1000
  });

  if (!result.ok) {
    return { ok: false, message: result.message, updated: [], conflicts: [], detail: svnErrorDetail(result.stderr), errorCode: result.errorCode };
  }

  const updated: Array<{ action: string; path: string }> = [];
  const conflicts: string[] = [];

  for (const line of result.stdout.split('\n')) {
    const match = line.match(/^([ADUCGER ])([ADUCGER ]?)[ B]?[ C]?\s+(.+)$/);

    if (!match || /^(Updating|Updated to|At revision|Summary of conflicts|Text conflicts|Tree conflicts|Merge conflicts|Restored)/.test(line)) {
      continue;
    }

    const action = match[1].trim() || match[2].trim();

    if (!action) {
      continue;
    }

    const updatedPath = toPosix(match[3].trim().replace(/^\.\//, ''));
    updated.push({ action, path: updatedPath });

    if (action === 'C' || match[2] === 'C') {
      conflicts.push(updatedPath);
    }
  }

  const revision = result.stdout.match(/(?:Updated to|At) revision (\d+)\./)?.[1];

  return {
    ok: true,
    revision,
    updated,
    conflicts,
    message: conflicts.length > 0
      ? `Atualizado para a revisão ${revision ?? '?'} com ${conflicts.length} conflito(s). Resolva antes de commitar.`
      : updated.length === 0
        ? `O checkout já estava na revisão ${revision ?? '?'}.`
        : `Atualizado para a revisão ${revision ?? '?'}: ${updated.length} arquivo(s).`
  };
}

export interface DiscardInput extends WorkingCopyOptions {
  checkoutPath: string;
  paths: string[];
  // Move um caminho para a Lixeira do sistema (no app: shell.trashItem).
  moveToTrash: (absolutePath: string) => Promise<void>;
}

export interface DiscardResult {
  ok: boolean;
  message: string;
  discarded: string[];
  errors: string[];
  errorCode?: 'NOTHING_SELECTED' | 'INVALID_SELECTION' | SvnErrorCode;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

// Guarda uma cópia do conteúdo atual na Lixeira antes de reverter, como o
// GitHub Desktop: descartar por engano tem volta.
async function backupToTrash(absolutePath: string, moveToTrash: DiscardInput['moveToTrash']): Promise<void> {
  if (!(await pathExists(absolutePath)) || (await isDirectory(absolutePath))) {
    return;
  }

  const folder = await mkdtemp(path.join(os.tmpdir(), 'svnflow-descartado-'));
  const copy = path.join(folder, path.basename(absolutePath));
  await copyFile(absolutePath, copy);
  await moveToTrash(copy);
  await rm(folder, { recursive: true, force: true });
}

export async function discardChanges(input: DiscardInput): Promise<DiscardResult> {
  const base = { discarded: [] as string[], errors: [] as string[] };

  if (input.paths.length === 0) {
    return { ...base, ok: false, message: 'Selecione pelo menos um arquivo para descartar.', errorCode: 'NOTHING_SELECTED' };
  }

  const status = await readWorkingCopyStatus(input.checkoutPath, input);

  if (!status.ok) {
    return { ...base, ok: false, message: status.message, errorCode: status.errorCode };
  }

  const byPath = new Map(status.changes.map((change) => [change.path, change]));
  const selected = [...new Set(input.paths)].map((item) => byPath.get(item));

  if (selected.some((change) => !change)) {
    return { ...base, ok: false, message: 'A seleção mudou. Atualize a lista de alterações e tente de novo.', errorCode: 'INVALID_SELECTION' };
  }

  const session = { cwd: input.checkoutPath, configDir: input.configDir };

  for (const change of selected as WorkingCopyChange[]) {
    const absolute = path.join(input.checkoutPath, change.path);

    try {
      if (change.kind === 'unversioned') {
        await input.moveToTrash(absolute);
      } else {
        if (['modified', 'replaced', 'conflicted', 'added'].includes(change.kind) && !change.propertiesOnly) {
          await backupToTrash(absolute, input.moveToTrash);
        }

        const depth = change.propertiesOnly ? 'empty' : 'infinity';
        const reverted = await runSvnInSession(['revert', '--depth', depth, '--', svnLocalTarget(change.path)], session);

        if (!reverted.ok) {
          throw new Error(`${reverted.message} ${svnErrorDetail(reverted.stderr)}`.trim());
        }

        // Arquivo adicionado volta a ser "fora do SVN" depois do revert: sai do disco (já está na Lixeira).
        if (change.kind === 'added' && (await pathExists(absolute))) {
          await rm(absolute, { recursive: true, force: true });
        }
      }

      base.discarded.push(change.path);
    } catch (error) {
      base.errors.push(`${change.path}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }
  }

  const ok = base.errors.length === 0;

  return {
    ...base,
    ok,
    message: ok
      ? `${base.discarded.length} alteração(ões) descartada(s). Uma cópia do conteúdo foi para a Lixeira.`
      : `${base.discarded.length} descartada(s), ${base.errors.length} com erro.`
  };
}

export interface IgnoreOnCommitInput extends WorkingCopyOptions {
  checkoutPath: string;
  path: string;
  // true: coloca no changelist ignore-on-commit; false: tira.
  ignore: boolean;
  // Aplica a todos os arquivos versionados dentro da pasta.
  recursive?: boolean;
}

export interface SimpleResult {
  ok: boolean;
  message: string;
  detail?: string;
}

function isSafeRelative(value: string): boolean {
  return value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]/).includes('..');
}

export async function setIgnoreOnCommit(input: IgnoreOnCommitInput): Promise<SimpleResult> {
  if (!isSafeRelative(input.path)) {
    return { ok: false, message: 'Caminho inválido.' };
  }

  const args = input.ignore
    ? ['changelist', ...(input.recursive ? ['--depth', 'infinity'] : []), IGNORE_ON_COMMIT, '--', svnLocalTarget(input.path)]
    : ['changelist', '--remove', ...(input.recursive ? ['--depth', 'infinity'] : []), '--', svnLocalTarget(input.path)];
  const result = await runSvnInSession(args, { cwd: input.checkoutPath, configDir: input.configDir });

  if (!result.ok) {
    return { ok: false, message: result.message, detail: svnErrorDetail(result.stderr) };
  }

  const what = input.recursive ? `Arquivos de ${input.path}` : input.path;

  return {
    ok: true,
    message: input.ignore
      ? `${what} ficará fora do commit por padrão (ignore-on-commit). Continua no SVN.`
      : `${what} voltou a entrar no commit normalmente.`
  };
}

export interface SvnIgnoreInput extends WorkingCopyOptions {
  checkoutPath: string;
  // Item fora do SVN que será ignorado.
  path: string;
  // 'item': ignora o próprio arquivo ou pasta; 'extension': ignora *.ext na mesma pasta.
  mode: 'item' | 'extension';
}

export async function addToSvnIgnore(input: SvnIgnoreInput): Promise<SimpleResult> {
  if (!isSafeRelative(input.path)) {
    return { ok: false, message: 'Caminho inválido.' };
  }

  const status = await readWorkingCopyStatus(input.checkoutPath, input);
  const change = status.changes.find((item) => item.path === input.path);

  if (!change || change.kind !== 'unversioned') {
    return { ok: false, message: 'O svn:ignore só vale para arquivos e pastas que ainda não estão no SVN. Para arquivos versionados, use "Ignorar no commit".' };
  }

  const name = path.posix.basename(input.path);
  const extension = path.posix.extname(name);

  if (input.mode === 'extension' && !extension) {
    return { ok: false, message: 'O arquivo não tem extensão.' };
  }

  const parent = path.posix.dirname(input.path);
  const pattern = input.mode === 'extension' ? `*${extension}` : name;
  const session = { cwd: input.checkoutPath, configDir: input.configDir };
  const current = await runSvnInSession(['propget', 'svn:ignore', '--', svnLocalTarget(parent)], session);
  // Sem a propriedade definida, o propget falha: começa de uma lista vazia.
  const patterns = current.ok ? current.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];

  if (patterns.includes(pattern)) {
    return { ok: true, message: `${pattern} já está no svn:ignore ${parent === '.' ? 'da raiz do projeto' : `de ${parent}`}.` };
  }

  const folder = await mkdtemp(path.join(os.tmpdir(), 'svnflow-ignore-'));
  const file = path.join(folder, 'svn-ignore.txt');

  try {
    await writeFile(file, `${[...patterns, pattern].join('\n')}\n`, 'utf8');
    const result = await runSvnInSession(['propset', 'svn:ignore', '-F', file, '--', svnLocalTarget(parent)], session);

    if (!result.ok) {
      return { ok: false, message: result.message, detail: svnErrorDetail(result.stderr) };
    }
  } finally {
    await rm(folder, { recursive: true, force: true });
  }

  const where = parent === '.' ? 'da raiz do projeto' : `de ${parent}`;

  return {
    ok: true,
    message: `${pattern} adicionado ao svn:ignore ${where}. Commite a alteração ${where} (aparece na lista) para valer para a equipe.`
  };
}
