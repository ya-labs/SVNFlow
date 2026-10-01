import type {
  IncomingResult,
  SvnXmlLogEntry,
  WorkingCopyStatus,
  RemoteListing,
  RepositoriesState,
  SvnCredentials,
  ConflictChoice,
  ConflictHunk,
  GitBranch,
  EnvironmentScreenState,
  AppTheme,
  SvnflowDesktopApi,
  SyncPlan,
  SyncScreenState
} from '../shared/ipc-types.js';

declare global {
  interface Window {
    svnflowDesktop?: SvnflowDesktopApi;
  }
}

interface AppState {
  selectedEnvironmentId?: string;
}

const state: AppState = {};

function api(): SvnflowDesktopApi {
  if (!window.svnflowDesktop) {
    throw new Error('Integração com o processo principal indisponível no preload.');
  }

  return window.svnflowDesktop;
}

// Concordância de número: "1 arquivo", "3 arquivos".
function plural(value: number, singular: string, pluralForm: string): string {
  return value === 1 ? singular : pluralForm;
}

function count(value: number, singular: string, pluralForm: string): string {
  return `${value} ${plural(value, singular, pluralForm)}`;
}

function escapeHtml(value: string | number | undefined): string {
  return String(value ?? '')
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');
}

function query<T extends HTMLElement>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

// Mensagens de andamento terminam em "..." (ou "…"); enquanto uma delas está
// na barra de status, o aviso de carregamento fica visível no topo da janela.
// Operações que demoram mais que alguns segundos ganham o botão "Cancelar".
let cancelTimer: number | undefined;

function setStatusMessage(message: string): void {
  const status = query<HTMLElement>('[data-role="app-status"]');

  if (status) {
    status.textContent = message;
  }

  const busy = /(\.\.\.|…)$/.test(message.trim());
  const indicator = query<HTMLElement>('[data-role="busy-indicator"]');

  if (indicator) {
    indicator.hidden = !busy;
    setText('busy-label', message.trim().replace(/(\.\.\.|…)$/, '…'));
  }

  const cancel = query<HTMLButtonElement>('[data-role="busy-cancel"]');
  window.clearTimeout(cancelTimer);

  if (cancel) {
    cancel.hidden = true;
    cancel.disabled = false;

    if (busy) {
      cancelTimer = window.setTimeout(() => {
        cancel.hidden = false;
      }, 2500);
    }
  }
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

function bindClick(root: ParentNode, selector: string, handler: (button: HTMLButtonElement) => void | Promise<void>): void {
  root.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
    button.addEventListener('click', () => {
      void handler(button);
    });
  });
}

// Visão principal (no estilo do GitHub Desktop)

type DesktopTab = 'changes' | 'history';
type ChangeKind = 'added' | 'untracked' | 'modified' | 'deleted' | 'conflicted';

interface ChangeItem {
  path: string;
  kind: ChangeKind;
  label: string;
  // Itens do checkout SVN têm caixa de seleção para o commit.
  checkable: boolean;
  selectable: boolean;
  workingCopyKind?: string;
  isDirectory?: boolean;
  propertiesOnly?: boolean;
  ignoredOnCommit?: boolean;
}

const ROOT_LABEL = '(raiz do projeto)';

interface CommitDraft {
  key: string;
  summary: string;
  description: string;
}

interface DesktopState {
  tab: DesktopTab;
  environments?: EnvironmentScreenState;
  screen?: SyncScreenState;
  workingCopy?: WorkingCopyStatus;
  log: HistoryLogState;
  incoming?: IncomingResult;
  selectedPath?: string;
  selectedRevision?: string;
  selectedLogPath?: string;
  // Caminhos marcados para o commit e caminhos já vistos (para aplicar o padrão só aos novos).
  checked: Set<string>;
  knownPaths: Set<string>;
  // Caminhos que já estavam em "ignorar no commit" na última leitura.
  knownIgnored: Set<string>;
  commitDraft?: CommitDraft;
  banner?: { tone: 'success' | 'warning' | 'error'; html: string };
  requestId: number;
  // Projeto a que pertencem os dados carregados (histórico, seleção, novidades).
  loadedEnvironmentId?: string;
  // Projeto com Git: mostra as alterações do checkout SVN mesmo com diferenças do Git.
  showSvnChanges?: boolean;
}

interface HistoryLogState {
  loaded: boolean;
  loading: boolean;
  entries: SvnXmlLogEntry[];
  hasMore: boolean;
  workingCopyRevision?: string;
  localRevisions?: string[];
  repositoryRoot?: string;
  projectPath?: string;
  url?: string;
  error?: string;
  detail?: string;
}

function emptyHistoryLog(): HistoryLogState {
  return { loaded: false, loading: false, entries: [], hasMore: false };
}

const desktop: DesktopState = { tab: 'changes', requestId: 0, checked: new Set(), knownPaths: new Set(), knownIgnored: new Set(), log: emptyHistoryLog() };

const CHANGE_ICONS: Record<ChangeKind, string> = { added: '+', untracked: '?', modified: '•', deleted: '−', conflicted: '!' };

const WORKING_COPY_LABELS: Record<string, { kind: ChangeKind; label: string }> = {
  modified: { kind: 'modified', label: 'Modificado' },
  replaced: { kind: 'modified', label: 'Substituído' },
  added: { kind: 'added', label: 'Adicionado' },
  unversioned: { kind: 'untracked', label: 'Novo (fora do SVN)' },
  deleted: { kind: 'deleted', label: 'Removido' },
  missing: { kind: 'deleted', label: 'Apagado do disco' },
  conflicted: { kind: 'conflicted', label: 'Em conflito' },
  obstructed: { kind: 'conflicted', label: 'Obstruído' }
};

const SYNC_LABELS: Record<'added' | 'modified' | 'deleted', string> = { added: 'Criar', modified: 'Atualizar', deleted: 'Remover' };

// Projeto com Git vinculado e com diferenças: primeiro passo é copiar do Git.
function hasGitDifferences(): boolean {
  return desktop.screen?.plan?.status === 'ready';
}

function isCopyStep(): boolean {
  return hasGitDifferences() && !desktop.showSvnChanges;
}

function currentChangeItems(): ChangeItem[] {
  if (isCopyStep()) {
    return desktop.screen!.plan!.changes.map((change) => ({
      path: change.path,
      kind: change.kind,
      label: SYNC_LABELS[change.kind],
      checkable: false,
      selectable: false
    }));
  }

  return (desktop.workingCopy?.changes ?? []).map((change) => {
    const mapped = WORKING_COPY_LABELS[change.kind] ?? { kind: 'modified' as ChangeKind, label: change.kind };
    const label = change.propertiesOnly ? 'Propriedades alteradas (ex.: svn:ignore)' : change.isDirectory ? `${mapped.label} (pasta)` : mapped.label;
    return {
      path: change.path,
      kind: mapped.kind,
      label: change.ignoredOnCommit ? `${label} · ignorado no commit` : label,
      checkable: true,
      selectable: change.selectable,
      workingCopyKind: change.kind,
      isDirectory: change.isDirectory,
      propertiesOnly: change.propertiesOnly,
      ignoredOnCommit: change.ignoredOnCommit
    };
  });
}

function checkedItems(): ChangeItem[] {
  return currentChangeItems().filter((item) => item.checkable && item.selectable && desktop.checked.has(item.path));
}

// Mantém a seleção entre recargas: caminhos novos recebem o padrão
// (não versionados desmarcados), e caminhos que sumiram saem da seleção.
function reconcileSelection(): void {
  const changes = desktop.workingCopy?.changes ?? [];
  const present = new Set(changes.map((change) => change.path));

  for (const change of changes) {
    if (!desktop.knownPaths.has(change.path)) {
      desktop.knownPaths.add(change.path);
      if (change.defaultSelected) {
        desktop.checked.add(change.path);
      }
    }

    if (!change.selectable) {
      desktop.checked.delete(change.path);
    }

    // Acabou de entrar em "ignorar no commit": sai da seleção.
    if (change.ignoredOnCommit && !desktop.knownIgnored.has(change.path)) {
      desktop.checked.delete(change.path);
    }
  }

  desktop.knownIgnored = new Set(changes.filter((change) => change.ignoredOnCommit).map((change) => change.path));

  for (const known of [...desktop.knownPaths]) {
    if (!present.has(known)) {
      desktop.knownPaths.delete(known);
      desktop.checked.delete(known);
    }
  }
}

function resetSelection(): void {
  desktop.checked = new Set();
  desktop.knownPaths = new Set();
  desktop.knownIgnored = new Set();
}

function firstLine(message: string): string {
  return message.split('\n')[0].trim();
}

function isNewOnServer(revision: string): boolean {
  const current = desktop.log.workingCopyRevision;
  return current !== undefined && Number(revision) > Number(current) && !desktop.log.localRevisions?.includes(revision);
}

function relativeLogPath(logPath: string): string {
  const projectPath = desktop.log.projectPath;
  return projectPath && projectPath !== '/' && logPath.startsWith(`${projectPath}/`) ? logPath.slice(projectPath.length + 1) : logPath;
}

async function loadHistory(more = false): Promise<void> {
  const log = desktop.log;

  if (log.loading || !state.selectedEnvironmentId) {
    return;
  }

  log.loading = true;
  renderSidebar();

  const environmentId = state.selectedEnvironmentId;
  const last = log.entries[log.entries.length - 1];
  const before = more && last ? String(Number(last.revision) - 1) : undefined;
  const page = await withCredentials(desktop.workingCopy?.url ?? '', (credentials) =>
    api().readSvnLog({ environmentId, before, credentials })
  );

  // Resposta de um projeto que já não está aberto: descarta.
  if (state.selectedEnvironmentId !== environmentId || desktop.log !== log) {
    return;
  }

  log.loading = false;
  log.loaded = true;

  if (!page.ok) {
    log.error = page.message;
    log.detail = page.detail;
  } else {
    log.error = undefined;
    log.entries = more ? [...log.entries, ...page.entries] : page.entries;
    log.hasMore = page.hasMore;
    log.workingCopyRevision = page.workingCopyRevision;
    log.localRevisions = page.localRevisions;
    log.repositoryRoot = page.repositoryRoot;
    log.url = page.url;
    log.projectPath = page.projectPath;
  }

  if (!log.entries.some((entry) => entry.revision === desktop.selectedRevision)) {
    desktop.selectedRevision = log.entries[0]?.revision;
    desktop.selectedLogPath = undefined;
  }

  setStatusMessage(page.message);
  renderDesktop();
}

function splitSuggestedMessage(message: string): { summary: string; description: string } {
  const [summary, ...rest] = message.split('\n');
  return { summary: summary.trim(), description: rest.join('\n').trim() };
}

function suggestedCommitMessage(): string {
  return desktop.environments?.selected?.gitWorkspacePath ? desktop.screen?.suggestedCommitMessage ?? '' : '';
}

function ensureCommitDraft(): CommitDraft {
  const key = desktop.screen?.plan?.source?.commit ?? `svn:${state.selectedEnvironmentId ?? ''}`;

  if (desktop.commitDraft?.key !== key) {
    desktop.commitDraft = { key, ...splitSuggestedMessage(suggestedCommitMessage()) };
  }

  return desktop.commitDraft;
}

// Toolbar ------------------------------------------------------------------

function setText(role: string, value: string): void {
  const element = query<HTMLElement>(`[data-role="${role}"]`);

  if (element) {
    element.textContent = value;
    element.title = value;
  }
}

function renderToolbar(): void {
  const screen = desktop.screen;
  const plan = screen?.plan;
  const source = plan?.source;
  const gitLinked = Boolean(desktop.environments?.selected?.gitWorkspacePath);
  const localChanges = desktop.workingCopy?.changes.length ?? 0;

  const hasProject = Boolean(desktop.environments?.selected);
  setText('environment-name', desktop.environments?.selected?.name ?? 'Nenhum projeto');

  // Sem projeto, branch e verificação não têm sobre o que agir.
  for (const role of ['branch-picker', 'refresh']) {
    const button = query<HTMLButtonElement>(`[data-role="${role}"]`);
    if (button) {
      button.hidden = !hasProject;
    }
  }
  setText('git-branch', source ? `${source.branch ?? 'HEAD'} · ${source.shortCommit}` : desktop.screen?.environment ? 'Sem Git vinculado' : '-');

  const branchPicker = query<HTMLButtonElement>('[data-role="branch-picker"]');
  if (branchPicker) {
    branchPicker.disabled = !gitLinked;
  }

  const refreshButton = query<HTMLButtonElement>('[data-role="refresh"]');
  const incoming = desktop.incoming?.ok ? desktop.incoming.incoming : 0;

  if (refreshButton) {
    refreshButton.dataset.mode = incoming > 0 ? 'update' : 'refresh';
  }

  if (incoming > 0) {
    setText('refresh-label', 'Atualizar do servidor');
    setText('refresh-value', count(incoming, 'revisão nova', 'revisões novas'));
  } else if (isCopyStep()) {
    setText('refresh-label', 'Diferenças com o Git');
    setText('refresh-value', `${count(plan!.changes.length, 'arquivo', 'arquivos')} a copiar`);
  } else if (desktop.workingCopy?.errorCode === 'MISSING_FOLDER') {
    setText('refresh-label', 'Pasta do projeto');
    setText('refresh-value', 'Não encontrada');
  } else if (localChanges > 0) {
    setText('refresh-label', 'Alterações locais');
    setText('refresh-value', `${count(localChanges, 'alteração', 'alterações')} no checkout`);
  } else {
    setText('refresh-label', 'Verificar alterações');
    setText('refresh-value', gitLinked ? 'SVN igual ao Git' : 'Checkout sem alterações');
  }

}

// Lista lateral -------------------------------------------------------------

// Caminho longo: o meio vira "…/" (ver fitChangePaths), mantendo visíveis a pasta
// de primeiro nível, a pasta pai e o nome do arquivo (ex.: src/…/pai/arquivo.ts).
function renderChangePath(directory: string, fileName: string): string {
  const segments = directory.split('/').filter(Boolean);
  const head = segments.length > 2 ? `${segments[0]}/` : '';
  const middle = segments.length > 2 ? `${segments.slice(1, -1).join('/')}/` : '';
  const parent = segments.length > 2 ? `${segments[segments.length - 1]}/` : directory;

  return `<span class="change-path">${head ? `<span class="change-dir path-head">${escapeHtml(head)}</span><span class="change-dir path-middle">${escapeHtml(middle)}</span><span class="change-dir path-ellipsis">…/</span>` : ''}<span class="path-tail"><span class="change-dir">${escapeHtml(parent)}</span>${escapeHtml(fileName)}</span></span>`;
}

// Recolhe o meio só dos caminhos que não cabem. Escreve, lê e escreve em lotes
// para forçar um único cálculo de layout mesmo com milhares de linhas.
function fitChangePaths(root: ParentNode = document): void {
  const paths = Array.from(root.querySelectorAll<HTMLElement>('.change-path')).filter((element) => element.querySelector('.path-middle'));
  paths.forEach((element) => element.classList.remove('collapsed'));
  // As partes têm overflow próprio: compara a largura natural somada com o espaço disponível.
  const naturalWidth = (element: HTMLElement): number => ['.path-head', '.path-middle', '.path-tail']
    .reduce((total, selector) => total + (element.querySelector<HTMLElement>(selector)?.scrollWidth ?? 0), 0);
  const overflowing = paths.filter((element) => naturalWidth(element) > element.clientWidth);
  overflowing.forEach((element) => element.classList.add('collapsed'));
}

function renderSplitPath(filePath: string): string {
  const slash = filePath.lastIndexOf('/');
  return renderChangePath(slash >= 0 ? filePath.slice(0, slash + 1) : '', filePath.slice(slash + 1));
}

function renderChangeRow(item: ChangeItem): string {
  const slash = item.path.lastIndexOf('/');
  const directory = slash >= 0 ? item.path.slice(0, slash + 1) : '';
  const fileName = item.path === '.' ? ROOT_LABEL : item.path.slice(slash + 1);
  const checkbox = item.checkable
    ? `<input type="checkbox" class="change-check" data-check-path="${escapeHtml(item.path)}" ${desktop.checked.has(item.path) ? 'checked' : ''} ${item.selectable ? '' : 'disabled'} aria-label="Incluir ${escapeHtml(item.path)} no commit" tabindex="-1" />`
    : '';

  return `
    <div class="change-row${item.ignoredOnCommit ? ' ignored-on-commit' : ''}" role="option" tabindex="0" data-path="${escapeHtml(item.path)}" aria-selected="${item.path === desktop.selectedPath}" title="${escapeHtml(`${item.label}: ${item.path === '.' ? ROOT_LABEL : item.path}`)}">
      ${checkbox}
      ${renderChangePath(directory, fileName)}
      <span class="change-icon" data-kind="${item.kind}" aria-label="${escapeHtml(item.label)}">${CHANGE_ICONS[item.kind]}</span>
    </div>
  `;
}

function renderSidebar(): void {
  const list = query<HTMLElement>('[data-role="sidebar-list"]');
  const counter = query<HTMLElement>('[data-role="changes-counter"]');
  const items = currentChangeItems();

  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === desktop.tab));
  });

  if (counter) {
    counter.textContent = String(items.length);
  }

  if (!list) {
    return;
  }

  if (!desktop.screen?.environment) {
    list.innerHTML = '<p class="list-empty">Nenhum projeto selecionado.</p>';
    return;
  }

  if (desktop.tab === 'history') {
    const log = desktop.log;

    if (log.error) {
      list.innerHTML = `<p class="list-empty">${escapeHtml(log.error)}</p><p class="list-empty"><button type="button" class="button" data-role="retry-history">Tentar de novo</button></p>`;
    } else if (!log.loaded) {
      list.innerHTML = '<p class="list-empty">Carregando histórico...</p>';
    } else if (log.entries.length === 0) {
      list.innerHTML = '<p class="list-empty">Nenhum commit no histórico.</p>';
    } else {
      list.innerHTML = `${log.entries.map((entry) => `
        <button type="button" class="history-row" data-revision="${escapeHtml(entry.revision)}" aria-selected="${entry.revision === desktop.selectedRevision}">
          <span class="history-title">${escapeHtml(firstLine(entry.message) || '(sem mensagem)')}</span>
          <span class="history-meta">${isNewOnServer(entry.revision) ? '<span class="badge-new">Novo</span> ' : ''}r${escapeHtml(entry.revision)} · ${escapeHtml(entry.author ?? 'sem autor')} · ${escapeHtml(formatDate(entry.date))}</span>
        </button>
      `).join('')}${log.hasMore ? `<p class="list-empty"><button type="button" class="button" data-role="load-more" ${log.loading ? 'disabled' : ''}>${log.loading ? 'Carregando...' : 'Carregar mais'}</button></p>` : ''}`;
    }
    return;
  }

  // Alterna entre a cópia do Git e as alterações do checkout SVN.
  const switcher = isCopyStep()
    ? `<div class="list-switch"><button type="button" class="link-button" data-role="show-svn-changes" title="Descartar, ignorar e commitar o que já está no checkout SVN">Ver alterações do checkout SVN</button></div>`
    : hasGitDifferences()
      ? `<div class="list-switch"><button type="button" class="link-button" data-role="show-copy-step">← Voltar ${plural(desktop.screen!.plan!.changes.length, 'à', 'às')} ${count(desktop.screen!.plan!.changes.length, 'diferença', 'diferenças')} do Git</button></div>`
      : '';

  const exclusions = desktop.screen?.plan?.exclusions ?? [];
  const exclusionGroup = exclusions.length > 0
    ? `<div class="list-group" title="Regras deste projeto: estes caminhos não são copiados nem removidos do Git para o SVN.">Não copiados para o SVN (${exclusions.length})</div>${exclusions.map((rule) => `
        <div class="exclusion-row">
          <span class="exclusion-path" title="${escapeHtml(rule)}">${escapeHtml(rule)}</span>
          <button type="button" class="link-button" data-role="include-sync" data-rule="${escapeHtml(rule)}">Voltar a copiar</button>
        </div>`).join('')}`
    : '';

  if (items.length === 0) {
    list.innerHTML = `${switcher}<p class="list-empty">Nenhuma alteração.</p>${exclusionGroup}`;
    return;
  }

  let header: string;

  if (isCopyStep()) {
    header = `<div class="list-header">${escapeHtml(`${count(items.length, 'arquivo diferente', 'arquivos diferentes')} do Git`)}</div>${switcher}`;
  } else {
    const selectable = items.filter((item) => item.selectable);
    const checked = checkedItems().length;
    const allChecked = selectable.length > 0 && checked === selectable.length;
    header = `
      <div class="list-header list-toolbar">
        <label class="select-all">
          <input type="checkbox" data-role="select-all" ${allChecked ? 'checked' : ''} ${selectable.length === 0 ? 'disabled' : ''} />
          <span>${count(items.length, 'alteração', 'alterações')} · ${count(checked, 'selecionada', 'selecionadas')}</span>
        </label>
        <button type="button" class="button small danger" data-role="discard-selected" ${checked === 0 ? 'disabled' : ''} title="Descartar as alterações marcadas">Descartar</button>
      </div>${switcher}
    `;
  }

  const regular = items.filter((item) => !item.ignoredOnCommit);
  const ignored = items.filter((item) => item.ignoredOnCommit);

  list.innerHTML = `${header}${regular.map(renderChangeRow).join('')}${ignored.length > 0
    ? `<div class="list-group" title="Arquivos no changelist ignore-on-commit: continuam no SVN, mas vêm desmarcados.">Ignorados no commit (${ignored.length})</div>${ignored.map(renderChangeRow).join('')}`
    : ''}${exclusionGroup}`;

  const selectAll = query<HTMLInputElement>('[data-role="select-all"]', list);
  if (selectAll && checkedItems().length > 0 && !selectAll.checked) {
    selectAll.indeterminate = true;
  }
}

function toggleChecked(filePath: string, checked?: boolean): void {
  const shouldCheck = checked ?? !desktop.checked.has(filePath);

  if (shouldCheck) {
    desktop.checked.add(filePath);
  } else {
    desktop.checked.delete(filePath);
  }

  renderSidebar();
  renderCommitBox();
}

function displayPath(filePath: string): string {
  return filePath === '.' ? ROOT_LABEL : filePath;
}

async function discardItems(items: ChangeItem[]): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const created = items.filter((item) => item.workingCopyKind === 'unversioned' || item.workingCopyKind === 'added').length;
  const preview = items.slice(0, 8).map((item) => `${CHANGE_ICONS[item.kind]} ${displayPath(item.path)}`).join('\n');
  const confirmed = await confirmModal({
    title: items.length === 1 ? 'Descartar mudanças' : `Descartar ${items.length} mudanças`,
    message: `As alterações serão desfeitas e o arquivo voltará ao estado do SVN.${created > 0 ? ' Arquivos novos serão removidos.' : ''} Uma cópia do conteúdo atual vai para a Lixeira, caso você precise recuperar.`,
    detail: `${preview}${items.length > 8 ? `\n… e mais ${items.length - 8}` : ''}`,
    confirmLabel: 'Descartar',
    danger: true
  });

  if (!confirmed) {
    return;
  }

  const result = await api().discardChanges(state.selectedEnvironmentId, items.map((item) => item.path));
  desktop.banner = {
    tone: result.ok ? 'success' : 'error',
    html: `<p><strong>${escapeHtml(result.message)}</strong></p>${result.errors.length > 0 ? `<ul>${result.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` : ''}`
  };
  desktop.selectedPath = undefined;
  setStatusMessage(result.message);
  await loadDesktop({ quiet: true });
}

async function runWorkingCopyAction(action: () => Promise<{ ok: boolean; message: string; detail?: string }>): Promise<void> {
  const result = await action();
  desktop.banner = {
    tone: result.ok ? 'success' : 'error',
    html: `<p><strong>${escapeHtml(result.message)}</strong></p>${result.detail ? `<pre class="review-markdown">${escapeHtml(result.detail)}</pre>` : ''}`
  };
  setStatusMessage(result.message);
  await loadDesktop({ quiet: true });
}

type ContextMenuEntry = 'separator' | { label: string; action: () => void | Promise<void>; danger?: boolean; disabled?: boolean; title?: string };

function closeContextMenu(): void {
  document.querySelector('.context-menu')?.remove();
}

function openContextMenu(x: number, y: number, entries: ContextMenuEntry[]): void {
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = entries.map((entry, index) => entry === 'separator'
    ? '<div class="context-separator" role="separator"></div>'
    : `<button type="button" role="menuitem" class="context-item${entry.danger ? ' danger' : ''}" data-index="${index}" ${entry.disabled ? 'disabled' : ''} title="${escapeHtml(entry.title ?? '')}">${escapeHtml(entry.label)}</button>`
  ).join('');
  document.body.appendChild(menu);

  // Mantém o menu dentro da janela.
  const bounds = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, window.innerWidth - bounds.width - 4)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - bounds.height - 4)}px`;

  menu.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-index]');
    const entry = button ? entries[Number(button.dataset.index)] : undefined;

    if (entry && entry !== 'separator' && !entry.disabled) {
      closeContextMenu();
      void entry.action();
    }
  });
  query<HTMLButtonElement>('.context-item:not([disabled])', menu)?.focus();
}

// Etapa de cópia: o arquivo ainda não foi copiado do Git para o checkout SVN.
function copyStepContextEntries(item: ChangeItem): ContextMenuEntry[] {
  const inGit = item.kind !== 'deleted';
  const inSvn = item.kind !== 'added';
  const later = 'Copie para o SVN ou use "Ver alterações do checkout SVN" para descartar e ignorar.';
  const parts = item.path.split('/');
  // Pasta do arquivo e, se for outra, a pasta de primeiro nível (ex.: .idea).
  const folders = [...new Set([parts.slice(0, -1).join('/'), parts[0]])].filter((folder) => folder && folder !== item.path);
  const exclude = (target: string): Promise<void> => runWorkingCopyAction(() => api().setSyncExclusion(state.selectedEnvironmentId, target, true));

  return [
    {
      label: 'Não copiar para o SVN',
      title: 'Este arquivo deixa de ser copiado (ou removido) do Git para o SVN neste projeto.',
      action: () => exclude(item.path)
    },
    ...folders.map((folder): ContextMenuEntry => ({
      label: `Não copiar a pasta "${folder}"`,
      title: 'Nada dentro desta pasta é copiado (ou removido) do Git para o SVN neste projeto.',
      action: () => exclude(folder)
    })),
    'separator',
    { label: 'Abrir no VS Code (Git)', disabled: !inGit, action: () => openInEditor('git', item.path) },
    { label: 'Abrir no VS Code (SVN)', disabled: !inSvn, action: () => openInEditor('svn', item.path) },
    { label: 'Mostrar na pasta do SVN', disabled: !inSvn, action: () => api().showItemInFolder(state.selectedEnvironmentId, item.path) },
    'separator',
    {
      label: 'Ignorar no commit',
      disabled: !inSvn,
      title: inSvn ? 'Depois da cópia, o arquivo fica desmarcado e separado na lista de commit (ignore-on-commit).' : 'O arquivo ainda não existe no SVN.',
      action: () => runWorkingCopyAction(() => api().setIgnoreOnCommit(state.selectedEnvironmentId, item.path, true))
    },
    { label: 'Descartar e svn:ignore: veja as alterações do SVN', disabled: true, title: later, action: () => undefined }
  ];
}

function contextEntriesFor(item: ChangeItem): ContextMenuEntry[] {
  return isCopyStep() ? copyStepContextEntries(item) : changeContextEntries(item);
}

function changeContextEntries(item: ChangeItem): ContextMenuEntry[] {
  const name = item.path === '.' ? ROOT_LABEL : item.path.slice(item.path.lastIndexOf('/') + 1);
  const parent = item.path.includes('/') ? item.path.slice(0, item.path.lastIndexOf('/')) : '';
  const extension = !item.isDirectory && name.includes('.') && !name.startsWith('.') ? name.slice(name.lastIndexOf('.')) : '';
  const onDisk = item.workingCopyKind !== 'missing' && item.workingCopyKind !== 'deleted';
  const selected = checkedItems();
  const entries: ContextMenuEntry[] = [
    { label: 'Descartar mudanças…', danger: true, action: () => discardItems([item]) }
  ];

  if (selected.length > 1 && selected.some((checked) => checked.path === item.path)) {
    entries.push({ label: `Descartar ${selected.length} mudanças selecionadas…`, danger: true, action: () => discardItems(selected) });
  }

  entries.push(
    'separator',
    { label: 'Abrir no VS Code', disabled: !onDisk, action: () => openInEditor('svn', item.path === '.' ? undefined : item.path) },
    { label: 'Mostrar na pasta', disabled: !onDisk, action: () => api().showItemInFolder(state.selectedEnvironmentId, item.path) },
    'separator'
  );

  if (item.workingCopyKind === 'unversioned') {
    entries.push({
      label: `Ignorar "${name}" (svn:ignore)`,
      action: () => runWorkingCopyAction(() => api().addToSvnIgnore(state.selectedEnvironmentId, item.path, 'item'))
    });

    if (extension) {
      entries.push({
        label: `Ignorar arquivos *${extension} nesta pasta`,
        action: () => runWorkingCopyAction(() => api().addToSvnIgnore(state.selectedEnvironmentId, item.path, 'extension'))
      });
    }
  } else if (!item.propertiesOnly) {
    entries.push(item.ignoredOnCommit
      ? { label: 'Voltar a incluir no commit', action: () => runWorkingCopyAction(() => api().setIgnoreOnCommit(state.selectedEnvironmentId, item.path, false)) }
      : {
          label: 'Ignorar no commit',
          title: 'O arquivo continua no SVN, mas fica desmarcado e separado na lista de commit (ignore-on-commit).',
          action: () => runWorkingCopyAction(() => api().setIgnoreOnCommit(state.selectedEnvironmentId, item.path, true))
        });

    if (parent) {
      entries.push(item.ignoredOnCommit
        ? { label: `Voltar a incluir a pasta "${parent}"`, action: () => runWorkingCopyAction(() => api().setIgnoreOnCommit(state.selectedEnvironmentId, parent, false, true)) }
        : {
            label: `Ignorar no commit a pasta "${parent}"`,
            title: 'Todos os arquivos versionados da pasta ficam desmarcados por padrão no commit.',
            action: () => runWorkingCopyAction(() => api().setIgnoreOnCommit(state.selectedEnvironmentId, parent, true, true))
          });
    }
  }

  return entries;
}

function selectSidebarItem(element: HTMLElement): void {
  if (element.dataset.path) {
    desktop.selectedPath = element.dataset.path;
  } else if (element.dataset.revision) {
    desktop.selectedRevision = element.dataset.revision;
    desktop.selectedLogPath = undefined;
  } else {
    return;
  }

  renderSidebar();
  query<HTMLElement>(`[aria-selected="true"]`, query<HTMLElement>('[data-role="sidebar-list"]')!)?.focus();
  void renderDetail();
}

function bindSidebar(): void {
  const list = query<HTMLElement>('[data-role="sidebar-list"]');

  list?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    if (target.matches('[data-role="select-all"]')) {
      const check = (target as HTMLInputElement).checked;
      currentChangeItems().filter((item) => item.selectable).forEach((item) => (check ? desktop.checked.add(item.path) : desktop.checked.delete(item.path)));
      renderSidebar();
      renderCommitBox();
      return;
    }

    if (target.matches('[data-role="discard-selected"]')) {
      void discardItems(checkedItems());
      return;
    }

    if (target.matches('[data-role="include-sync"]')) {
      void runWorkingCopyAction(() => api().setSyncExclusion(state.selectedEnvironmentId, target.dataset.rule ?? '', false));
      return;
    }

    if (target.matches('[data-role="show-svn-changes"], [data-role="show-copy-step"]')) {
      desktop.showSvnChanges = target.matches('[data-role="show-svn-changes"]');
      desktop.selectedPath = undefined;
      void loadDesktop();
      return;
    }

    if (target.matches('[data-role="load-more"]')) {
      void loadHistory(true);
      return;
    }

    if (target.matches('[data-role="retry-history"]')) {
      desktop.log = emptyHistoryLog();
      void loadHistory();
      return;
    }

    if (target.matches('.change-check')) {
      toggleChecked(target.dataset.checkPath ?? '', (target as HTMLInputElement).checked);
      return;
    }

    const row = target.closest<HTMLElement>('.change-row, .history-row');
    if (row) {
      selectSidebarItem(row);
    }
  });

  list?.addEventListener('contextmenu', (event) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('.change-row');
    const item = row ? currentChangeItems().find((candidate) => candidate.path === row.dataset.path) : undefined;

    if (!row || !item) {
      return;
    }

    event.preventDefault();
    selectSidebarItem(row);
    openContextMenu(event.clientX, event.clientY, contextEntriesFor(item));
  });

  list?.addEventListener('keydown', (event) => {
    const focused = document.activeElement as HTMLElement | null;

    // Shift+F10 ou tecla de menu abrem o menu de contexto pelo teclado.
    if ((event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) && focused?.matches('.change-row')) {
      const item = currentChangeItems().find((candidate) => candidate.path === focused.dataset.path);
      if (item) {
        event.preventDefault();
        const bounds = focused.getBoundingClientRect();
        openContextMenu(bounds.left + 24, bounds.bottom, contextEntriesFor(item));
      }
      return;
    }

    // Espaço marca ou desmarca o arquivo em foco, como no GitHub Desktop.
    if (event.key === ' ' && focused?.matches('.change-row')) {
      const checkbox = query<HTMLInputElement>('.change-check', focused);
      if (checkbox && !checkbox.disabled) {
        event.preventDefault();
        toggleChecked(focused.dataset.path ?? '');
        query<HTMLElement>(`.change-row[data-path="${CSS.escape(focused.dataset.path ?? '')}"]`, list)?.focus();
      }
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    const rows = Array.from(list.querySelectorAll<HTMLElement>('.change-row, .history-row'));
    const current = rows.findIndex((row) => row.getAttribute('aria-selected') === 'true');
    const next = rows[Math.min(rows.length - 1, Math.max(0, current + (event.key === 'ArrowDown' ? 1 : -1)))];

    if (next) {
      event.preventDefault();
      selectSidebarItem(next);
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      desktop.tab = tab.dataset.tab === 'history' ? 'history' : 'changes';

      renderDesktop();

      if (desktop.tab === 'history' && !desktop.log.loaded) {
        void loadHistory();
      }
    });
  });
}

// Caixa de commit -----------------------------------------------------------

// Projeto com Git: deixa explícito em qual das duas etapas a pessoa está,
// para não confundir copiar (local) com commitar (publica no servidor).
function renderFlowSteps(current: 1 | 2): string {
  if (!desktop.screen?.environment?.gitWorkspacePath) {
    return '';
  }

  const copyPending = hasGitDifferences();
  // Sincronização bloqueada (ex.: conflito no checkout): a cópia não foi feita nem pode ser.
  const copyBlocked = desktop.screen?.plan?.status === 'blocked';
  const step = (index: 1 | 2, title: string, detail: string): string => {
    const status = index === current ? 'current' : index !== 1 ? 'todo' : copyBlocked ? 'blocked' : copyPending ? 'pending' : 'done';
    const marker = status === 'done' ? '✓' : status === 'blocked' ? '!' : String(index);
    return `<li class="flow-step" data-status="${status}" ${index === current ? 'aria-current="step"' : ''}><span class="flow-marker">${marker}</span><span class="flow-text"><strong>${title}</strong><small>${detail}</small></span></li>`;
  };

  return `
    <ol class="flow-steps" aria-label="Etapas da sincronização">
      ${step(1, 'Copiar do Git', copyBlocked ? 'bloqueado' : copyPending ? 'só local' : 'concluído')}
      <li class="flow-arrow" aria-hidden="true">›</li>
      ${step(2, 'Publicar no SVN', 'no servidor')}
    </ol>
    ${current === 2 && copyPending ? '<p class="commit-box-hint warning">Ainda há diferenças do Git não copiadas. Este commit publica só o que já está no checkout.</p>' : ''}
  `;
}

function renderCommitBox(): void {
  const box = query<HTMLElement>('[data-role="commit-box"]');
  const screen = desktop.screen;
  const plan = screen?.plan;

  if (!box) {
    return;
  }

  if (desktop.tab !== 'changes' || !screen?.environment) {
    box.innerHTML = '';
    return;
  }

  if (isCopyStep() && plan?.source) {
    box.innerHTML = `
      ${renderFlowSteps(1)}
      <p class="commit-box-hint">Atualiza só os arquivos locais do checkout SVN para o commit <strong>${escapeHtml(plan.source.shortCommit)}</strong>. <strong>Nada é publicado no servidor nesta etapa.</strong></p>
      <button type="button" class="button block copy-action" data-role="copy-to-svn" title="Ctrl+Enter">⇣ Copiar ${count(plan.changes.length, 'arquivo', 'arquivos')} para o checkout</button>
    `;
    bindClick(box, '[data-role="copy-to-svn"]', copyToSvn);
    return;
  }

  if ((desktop.workingCopy?.changes.length ?? 0) === 0) {
    const steps = renderFlowSteps(2);
    box.innerHTML = steps ? `${steps}<p class="commit-box-hint">Nada no checkout para publicar.</p>` : '';
    return;
  }

  const draft = ensureCommitDraft();
  const selectedCount = checkedItems().length;
  const hasSuggestion = suggestedCommitMessage().length > 0;

  box.innerHTML = `
    ${renderFlowSteps(2)}
    <input class="input" data-role="commit-summary" type="text" placeholder="Resumo (obrigatório)" value="${escapeHtml(draft.summary)}" aria-label="Resumo do commit SVN" />
    <textarea class="input" data-role="commit-description" placeholder="Descrição" aria-label="Descrição do commit SVN">${escapeHtml(draft.description)}</textarea>
    ${hasSuggestion ? '<button type="button" class="commit-box-link" data-role="reset-message">Restaurar mensagem sugerida</button>' : ''}
    <button type="button" class="button success block" data-role="commit-svn" title="Ctrl+Enter">${selectedCount > 0 ? `⇡ Publicar ${count(selectedCount, 'arquivo', 'arquivos')} no SVN (commit)` : 'Selecione arquivos para commitar'}</button>
  `;

  const summary = query<HTMLInputElement>('[data-role="commit-summary"]', box)!;
  const description = query<HTMLTextAreaElement>('[data-role="commit-description"]', box)!;
  const submit = query<HTMLButtonElement>('[data-role="commit-svn"]', box)!;

  const refresh = () => {
    draft.summary = summary.value;
    draft.description = description.value;
    submit.disabled = summary.value.trim().length === 0 || selectedCount === 0;
  };

  summary.addEventListener('input', refresh);
  description.addEventListener('input', refresh);
  refresh();

  bindClick(box, '[data-role="reset-message"]', () => {
    desktop.commitDraft = undefined;
    renderCommitBox();
  });
  bindClick(box, '[data-role="commit-svn"]', commitToSvn);
}

async function copyToSvn(): Promise<void> {
  const plan = desktop.screen?.plan;

  if (!plan?.source) {
    return;
  }

  const confirmed = await confirmModal({
    title: 'Etapa 1 de 2 · Copiar do Git para o checkout',
    message: `${count(plan.totals.added, 'arquivo criado', 'arquivos criados')}, ${count(plan.totals.modified, 'atualizado', 'atualizados')} e ${count(plan.totals.deleted, 'removido', 'removidos')} em ${plan.svnCheckoutPath}, para ficar igual ao commit ${plan.source.shortCommit}. Nada será publicado no SVN ainda.`,
    confirmLabel: 'Copiar arquivos'
  });

  if (!confirmed) {
    return;
  }

  setStatusMessage('Copiando arquivos do Git para o checkout SVN...');
  const response = await api().executeSync(state.selectedEnvironmentId);
  const errors = response.result?.errors ?? [];

  desktop.banner = errors.length > 0
    ? { tone: 'error', html: `<p><strong>Erros ao atualizar o checkout</strong></p><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>` }
    : undefined;
  desktop.selectedPath = undefined;
  // Depois da cópia, tudo vem marcado: é o espelho do commit Git.
  resetSelection();
  await loadDesktop({ quiet: true });
  (desktop.workingCopy?.changes ?? []).filter((change) => change.selectable).forEach((change) => desktop.checked.add(change.path));
  setStatusMessage(response.result?.message ?? response.screen.message);
  renderDesktop();
}

// Revisão final antes do commit: o commit cria uma revisão no servidor, visível
// para a equipe, então a confirmação mostra tudo o que vai ser publicado.
function publishReviewModal(items: ChangeItem[], draft: CommitDraft, url: string): Promise<boolean> {
  const ofKind = (kind: ChangeKind): number => items.filter((item) => item.kind === kind).length;
  const totals = ([['added', 'novo', 'novos'], ['untracked', 'novo fora do SVN', 'novos fora do SVN'], ['modified', 'alterado', 'alterados'], ['deleted', 'removido', 'removidos']] as Array<[ChangeKind, string, string]>)
    .filter(([kind]) => ofKind(kind) > 0)
    .map(([kind, singular, pluralForm]) => `<span class="review-chip" data-kind="${kind}"><span class="change-icon" data-kind="${kind}">${CHANGE_ICONS[kind]}</span>${count(ofKind(kind), singular, pluralForm)}</span>`)
    .join('');
  const title = desktop.screen?.environment?.gitWorkspacePath ? 'Etapa 2 de 2 · Publicar no servidor SVN' : 'Publicar no servidor SVN';

  return new Promise((resolve) => {
    const modal = openModal(`
      <div class="modal-header">${escapeHtml(title)}</div>
      <div class="modal-body publish-review">
        <p class="publish-warning">Isto cria uma <strong>nova revisão no servidor</strong>, visível para toda a equipe. Confira antes de publicar.</p>
        <div class="review-field">
          <span class="review-label">Destino</span>
          <code class="review-url" title="${escapeHtml(url)}">${escapeHtml(url || desktop.screen?.environment?.svnCheckoutPath || 'checkout SVN')}</code>
        </div>
        <div class="review-field">
          <span class="review-label">Mensagem</span>
          <div class="review-message"><strong>${escapeHtml(draft.summary.trim())}</strong>${draft.description.trim() ? `<p>${escapeHtml(draft.description.trim())}</p>` : ''}</div>
        </div>
        <div class="review-field">
          <span class="review-label">${count(items.length, 'arquivo', 'arquivos')}</span>
          <div class="review-chips">${totals}</div>
          <ul class="review-files">${items.map((item) => `<li title="${escapeHtml(item.path)}"><span class="change-icon" data-kind="${item.kind}">${CHANGE_ICONS[item.kind]}</span>${renderSplitPath(item.path)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="button" data-role="modal-cancel">Voltar e revisar</button>
        <button type="button" class="button success" data-role="modal-confirm">⇡ Publicar ${count(items.length, 'arquivo', 'arquivos')} no SVN</button>
      </div>
    `);
    modal.classList.add('modal-wide');
    const finish = (value: boolean) => {
      closeModal();
      resolve(value);
    };

    closeActiveModal = () => finish(false);
    bindClick(modal, '[data-role="modal-cancel"]', () => finish(false));
    bindClick(modal, '[data-role="modal-confirm"]', () => finish(true));
    // Foco no "Voltar": Enter por engano não publica.
    query<HTMLButtonElement>('[data-role="modal-cancel"]', modal)?.focus();
  });
}

async function commitToSvn(): Promise<void> {
  const draft = desktop.commitDraft;
  const items = checkedItems();
  const url = desktop.workingCopy?.url ?? '';

  if (!draft || items.length === 0) {
    return;
  }

  const message = draft.description.trim() ? `${draft.summary.trim()}\n\n${draft.description.trim()}` : draft.summary.trim();
  const confirmed = await publishReviewModal(items, draft, url);

  if (!confirmed) {
    return;
  }

  setStatusMessage('Executando svn commit...');
  const paths = items.map((item) => item.path);
  const result = await withCredentials(url, (credentials) => api().commitSelected({ environmentId: state.selectedEnvironmentId, paths, message, credentials, allowGitDifferences: desktop.showSvnChanges === true }));

  if (result.ok) {
    desktop.commitDraft = undefined;
    desktop.banner = {
      tone: 'success',
      html: `<p><strong>${escapeHtml(result.message)}</strong></p>`
    };
    desktop.selectedRevision = result.revision;
    desktop.selectedLogPath = undefined;
    desktop.log = emptyHistoryLog();
  } else {
    desktop.banner = {
      tone: 'error',
      html: `<p><strong>Commit não realizado.</strong> ${escapeHtml(result.message)}</p>${result.errorCode === 'OUT_OF_DATE' ? '<p><button type="button" class="button primary" data-role="banner-update">Atualizar agora</button></p>' : ''}${result.detail ? `<pre class="review-markdown">${escapeHtml(result.detail)}</pre>` : ''}`
    };
  }

  desktop.selectedPath = undefined;
  setStatusMessage(result.message);
  await loadDesktop({ quiet: true });
}

// Painel de detalhe ---------------------------------------------------------

function renderBanner(): string {
  return desktop.banner ? `<div class="banner" data-tone="${desktop.banner.tone}">${desktop.banner.html}</div>` : '';
}

function renderWarnings(plan: SyncPlan | undefined): string {
  if (!plan || plan.warnings.length === 0) {
    return '';
  }

  return `<div class="banner" data-tone="warning"><ul>${plan.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>`;
}

function renderDiffTable(lines: string[]): string {
  let oldLine = 0;
  let newLine = 0;
  const rows: string[] = [];

  for (const line of lines) {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);

    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      rows.push(`<tr class="hunk"><td class="ln"></td><td class="ln"></td><td class="code">${escapeHtml(line)}</td></tr>`);
    } else if (line.startsWith('+')) {
      rows.push(`<tr class="add"><td class="ln"></td><td class="ln">${newLine++}</td><td class="code">${escapeHtml(line)}</td></tr>`);
    } else if (line.startsWith('-')) {
      rows.push(`<tr class="del"><td class="ln">${oldLine++}</td><td class="ln"></td><td class="code">${escapeHtml(line)}</td></tr>`);
    } else if (line.startsWith('\\')) {
      rows.push(`<tr class="hunk"><td class="ln"></td><td class="ln"></td><td class="code">${escapeHtml(line)}</td></tr>`);
    } else {
      rows.push(`<tr><td class="ln">${oldLine++}</td><td class="ln">${newLine++}</td><td class="code">${escapeHtml(line)}</td></tr>`);
    }
  }

  return `<table class="diff"><tbody>${rows.join('')}</tbody></table>`;
}

function blankSlate(title: string, message: string, extra = ''): string {
  return `<div class="blank-slate"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${extra}</div>`;
}

function suggestion(title: string, description: string, role: string, label: string, extra?: { role: string; label: string }): string {
  return `
    <div class="suggestion">
      <span class="suggestion-text"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></span>
      <span class="suggestion-actions">
        ${extra ? `<button type="button" class="button" data-role="${extra.role}">${escapeHtml(extra.label)}</button>` : ''}
        <button type="button" class="button" data-role="${role}">${escapeHtml(label)}</button>
      </span>
    </div>
  `;
}

async function openInEditor(which: 'git' | 'svn', filePath?: string): Promise<void> {
  const result = await api().openInEditor(state.selectedEnvironmentId, which, filePath);

  if (!result.ok) {
    desktop.banner = { tone: 'error', html: `<p><strong>${escapeHtml(result.message)}</strong></p>` };
    void renderDetail();
  }

  setStatusMessage(result.message);
}

async function relocateProject(): Promise<void> {
  const selected = desktop.environments?.selected;
  const folder = selected ? await api().selectDirectory('Escolher a nova pasta do checkout SVN') : undefined;

  if (!selected || !folder) {
    return;
  }

  const result = await api().relocateProject(selected.id, folder);
  desktop.banner = { tone: result.ok ? 'success' : 'error', html: `<p><strong>${escapeHtml(result.message)}</strong></p>` };
  await loadDesktop();
}

function bindDetailActions(detail: HTMLElement): void {
  bindClick(detail, '[data-role="add-environment"]', () => openAddEnvironmentModal());
  bindClick(detail, '[data-role="open-svn"]', () => api().openEnvironmentFolder(state.selectedEnvironmentId, 'svn'));
  bindClick(detail, '[data-role="open-git"]', () => api().openEnvironmentFolder(state.selectedEnvironmentId, 'git'));
  bindClick(detail, '[data-role="code-svn"]', () => openInEditor('svn'));
  bindClick(detail, '[data-role="code-git"]', () => openInEditor('git'));
  bindClick(detail, '[data-role="refresh-detail"]', () => loadDesktop());
  bindClick(detail, '[data-role="link-git"]', () => openLinkGitModal());
  bindClick(detail, '[data-role="banner-update"]', () => updateFromServer());
  bindClick(detail, '[data-role="open-repositories-inline"]', () => showRepositoriesView());
  bindClick(detail, '[data-role="relocate-project"]', () => relocateProject());
  bindClick(detail, '[data-role="remove-missing-project"]', async () => {
    const selected = desktop.environments?.selected;

    if (selected && await confirmModal({ title: 'Remover projeto', message: `Remover "${selected.name}" da lista? Nenhuma pasta é apagada.`, confirmLabel: 'Remover', danger: true })) {
      await api().removeEnvironment(selected.id);
      state.selectedEnvironmentId = undefined;
      desktop.banner = undefined;
      await loadDesktop();
    }
  });
}

// Fecha o diff aberto e volta para a tela inicial da aba (ou para a revisão).
function closeDiff(): boolean {
  if (desktop.tab === 'changes' && desktop.selectedPath) {
    desktop.selectedPath = undefined;
  } else if (desktop.tab === 'history' && desktop.selectedRevision) {
    desktop.selectedRevision = undefined;
    desktop.selectedLogPath = undefined;
  } else {
    return false;
  }

  renderSidebar();
  void renderDetail();
  return true;
}

async function renderDiffDetail(detail: HTMLElement, item: ChangeItem, requestId: number): Promise<void> {
  detail.innerHTML = `${renderBanner()}<div class="diff-header">${escapeHtml(item.path)}</div><p class="list-empty">Carregando diff...</p>`;
  const copyStep = isCopyStep();
  const diff = copyStep
    ? await api().getSyncFileDiff(state.selectedEnvironmentId, item.path)
    : await api().getWorkingCopyDiff(state.selectedEnvironmentId, item.path);

  if (requestId !== desktop.requestId) {
    return;
  }

  const sourceLabel = copyStep ? 'Git → checkout SVN' : item.label;
  const header = `<div class="diff-header"><span class="change-icon" data-kind="${item.kind}">${CHANGE_ICONS[item.kind]}</span>${escapeHtml(item.path)}<span class="diff-header-source">${escapeHtml(sourceLabel)}</span><button type="button" class="diff-close" data-role="close-diff" title="Fechar diff (Esc)" aria-label="Fechar diff">×</button></div>`;
  let body: string;

  if (item.kind === 'conflicted') {
    body = renderConflictPanel(item, await api().getConflictHunks(state.selectedEnvironmentId, item.path));

    if (requestId !== desktop.requestId) {
      return;
    }
  } else if (!diff || diff.kind === 'empty') {
    body = blankSlate('Sem diferença de conteúdo', item.kind === 'deleted' ? 'O arquivo será removido do SVN.' : 'Não há diferença textual para mostrar.');
  } else if (diff.kind === 'binary') {
    body = blankSlate('Arquivo binário', 'O conteúdo binário não pode ser exibido como diff.');
  } else if (diff.kind === 'directory') {
    body = blankSlate('Pasta', item.kind === 'deleted' ? 'A pasta e todo o conteúdo dela serão removidos do SVN.' : 'A pasta e os arquivos dentro dela serão adicionados ao SVN.');
  } else if (diff.kind === 'too-large') {
    body = blankSlate('Arquivo muito grande', 'O diff não é exibido para arquivos acima de 5 MB.');
  } else {
    body = `${renderDiffTable(diff.lines)}${diff.truncated ? '<p class="list-empty">Diff truncado para exibição.</p>' : ''}`;
  }

  detail.innerHTML = `${renderBanner()}${header}${body}`;
  bindConflictActions(detail, item);
}

// Conflito: mostra os trechos dos dois lados e deixa escolher como resolver.
function renderConflictPanel(item: ChangeItem, hunks: ConflictHunk[]): string {
  const side = (title: string, lines: string[]): string => `
    <div class="conflict-side">
      <div class="conflict-side-title">${title}</div>
      <pre>${lines.length > 0 ? escapeHtml(lines.join('\n')) : '<span class="conflict-empty">(vazio)</span>'}</pre>
    </div>`;
  const comparison = hunks.length > 0
    ? hunks.map((hunk, index) => `
        <div class="conflict-hunk">
          ${hunks.length > 1 ? `<div class="review-label">Trecho ${index + 1} de ${hunks.length}</div>` : ''}
          <div class="conflict-sides">${side('Sua versão', hunk.mine)}${side('Versão do servidor', hunk.theirs)}</div>
        </div>`).join('')
    : `<p class="conflict-note">${item.isDirectory ? 'Conflito de estrutura (pasta movida, apagada ou criada dos dois lados).' : 'Não há trechos marcados para comparar (arquivo binário ou conflito de estrutura).'}</p>`;

  return `
    <div class="conflict-panel">
      <div class="conflict-intro">
        <strong>${escapeHtml(item.path)} mudou no seu checkout e no servidor.</strong>
        <p>Escolha qual versão fica, ou edite o arquivo e marque como resolvido. Até resolver, ele não pode ser commitado.</p>
      </div>
      ${comparison}
      <div class="conflict-actions">
        <button type="button" class="button" data-conflict-choice="mine">Ficar com a minha</button>
        <button type="button" class="button" data-conflict-choice="theirs">Ficar com a do servidor</button>
        <button type="button" class="button" data-role="conflict-editor">Abrir no VS Code</button>
        <button type="button" class="button primary" data-conflict-choice="edited">Já editei, marcar como resolvido</button>
      </div>
    </div>`;
}

function bindConflictActions(detail: HTMLElement, item: ChangeItem): void {
  bindClick(detail, '[data-role="conflict-editor"]', () => openInEditor('svn', item.path));
  bindClick(detail, '[data-conflict-choice]', async (button) => {
    const choice = button.dataset.conflictChoice as ConflictChoice;

    if (choice !== 'edited') {
      const confirmed = await confirmModal({
        title: choice === 'mine' ? 'Ficar com a sua versão' : 'Ficar com a versão do servidor',
        message: choice === 'mine'
          ? `As mudanças do servidor em ${item.path} serão ignoradas. O arquivo fica como estava no seu checkout antes do update.`
          : `As suas mudanças em ${item.path} serão perdidas. O arquivo fica igual ao do servidor.`,
        confirmLabel: 'Resolver',
        danger: choice === 'theirs'
      });

      if (!confirmed) {
        return;
      }
    }

    await runWorkingCopyAction(() => api().resolveConflict(state.selectedEnvironmentId, item.path, choice));
  });
}

const LOG_ACTION_KIND: Record<string, ChangeKind> = { A: 'added', D: 'deleted', M: 'modified', R: 'modified' };

async function renderRevisionDiff(container: HTMLElement, revision: string, logPath: string): Promise<void> {
  const root = desktop.log.repositoryRoot;
  container.innerHTML = '<p class="list-empty">Carregando diff...</p>';

  if (!root) {
    container.innerHTML = blankSlate('Diff indisponível', 'Não foi possível descobrir a raiz do repositório.');
    return;
  }

  const diff = await withCredentials(root, (credentials) => api().readRevisionDiff({ repositoryRoot: root, revision, path: logPath, credentials }).then((result) => ({ ...result, errorCode: undefined })));

  if (desktop.selectedRevision !== revision || desktop.selectedLogPath !== logPath) {
    return;
  }

  const header = `<div class="diff-header">${escapeHtml(relativeLogPath(logPath))}<span class="diff-header-source">r${escapeHtml(revision)}</span><button type="button" class="diff-close" data-role="close-diff" title="Fechar diff (Esc)" aria-label="Fechar diff">×</button></div>`;

  if (diff.kind === 'binary') {
    container.innerHTML = header + blankSlate('Arquivo binário', 'O conteúdo binário não pode ser exibido como diff.');
  } else if (diff.kind !== 'text') {
    container.innerHTML = header + blankSlate('Sem diff para mostrar', 'Pasta, arquivo copiado sem alteração ou arquivo removido.');
  } else {
    container.innerHTML = `${header}${renderDiffTable(diff.lines)}${diff.truncated ? '<p class="list-empty">Diff truncado para exibição.</p>' : ''}`;
  }
}

function renderRevisionDetail(detail: HTMLElement, revision: string): void {
  const entry = desktop.log.entries.find((item) => item.revision === revision);

  if (!entry) {
    detail.innerHTML = `${renderBanner()}${blankSlate(`Revisão ${revision}`, 'Revisão não carregada.')}`;
    return;
  }

  const [title, ...rest] = entry.message.split('\n');
  const body = rest.join('\n').trim();
  const paths = entry.paths.filter((item) => item.kind !== 'dir' || item.action === 'D');

  if (!desktop.selectedLogPath && paths.length > 0) {
    desktop.selectedLogPath = paths[0].path;
  }

  detail.innerHTML = `
    ${renderBanner()}
    <div class="detail-section">
      <h2>${escapeHtml(title.trim() || '(sem mensagem)')}</h2>
      <p class="detail-meta">r${escapeHtml(revision)} · ${escapeHtml(entry.author ?? 'sem autor')} · ${escapeHtml(formatDate(entry.date))} · ${count(paths.length, 'arquivo', 'arquivos')}${isNewOnServer(revision) ? ' · <span class="badge-new">Ainda não está no seu checkout</span>' : ''}</p>
      ${body ? `<p class="commit-message-view">${escapeHtml(body)}</p>` : ''}
      <div class="revision-actions">
        <button type="button" class="button small" data-role="revert-revision" ${isNewOnServer(revision) ? 'disabled title="Atualize do servidor antes: esta revisão ainda não está no seu checkout."' : 'title="Aplica no checkout o inverso desta revisão. Nada é publicado até você commitar."'}>Desfazer esta revisão…</button>
        <button type="button" class="button small" data-role="checkout-revision" title="Baixa o projeto como estava nesta revisão, numa pasta separada.">Checkout nesta revisão…</button>
      </div>
    </div>
    <div class="revision-layout">
      <ul class="path-list revision-files">
        ${paths.map((item) => {
          const kind = LOG_ACTION_KIND[item.action] ?? 'modified';
          return `<li><button type="button" class="revision-file" data-log-path="${escapeHtml(item.path)}" aria-selected="${item.path === desktop.selectedLogPath}" title="${escapeHtml(item.path)}"><span class="change-icon" data-kind="${kind}">${CHANGE_ICONS[kind]}</span>${renderSplitPath(relativeLogPath(item.path))}</button></li>`;
        }).join('')}
      </ul>
      <div class="revision-diff" data-role="revision-diff"></div>
    </div>
  `;

  const diffContainer = query<HTMLElement>('[data-role="revision-diff"]', detail)!;

  bindDetailActions(detail);
  bindClick(detail, '[data-role="revert-revision"]', () => undoRevision(entry));
  bindClick(detail, '[data-role="checkout-revision"]', () => {
    if (desktop.log.url) {
      void openCheckoutModal(desktop.log.url, revision);
    }
  });

  bindClick(detail, '[data-log-path]', (button) => {
    desktop.selectedLogPath = button.dataset.logPath;
    detail.querySelectorAll<HTMLElement>('[data-log-path]').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
    void renderRevisionDiff(diffContainer, revision, button.dataset.logPath ?? '');
  });

  if (desktop.selectedLogPath) {
    void renderRevisionDiff(diffContainer, revision, desktop.selectedLogPath);
  } else {
    diffContainer.innerHTML = blankSlate('Sem arquivos', 'Esta revisão só alterou propriedades ou pastas.');
  }
}

// Desfazer revisão: aplica o inverso no checkout e prepara a mensagem do commit.
async function undoRevision(entry: SvnXmlLogEntry): Promise<void> {
  const title = firstLine(entry.message) || '(sem mensagem)';
  const localChanges = desktop.workingCopy?.changes.length ?? 0;
  const confirmed = await confirmModal({
    title: `Desfazer a revisão ${entry.revision}`,
    message: `As mudanças de "${title}" serão desfeitas no seu checkout. Nada é publicado: você revisa em Alterações e publica com um novo commit.${localChanges > 0 ? ` O checkout já tem ${count(localChanges, 'alteração local', 'alterações locais')}, que vão se misturar com o desfazer.` : ''}`,
    confirmLabel: 'Desfazer no checkout'
  });

  if (!confirmed) {
    return;
  }

  setStatusMessage(`Desfazendo a revisão ${entry.revision}...`);
  const url = desktop.log.url ?? '';
  const result = await withCredentials(url, (credentials) => api().revertRevision(state.selectedEnvironmentId, entry.revision, credentials));
  setStatusMessage(result.message);

  if (!result.ok) {
    desktop.banner = {
      tone: 'error',
      html: `<p><strong>${escapeHtml(result.message)}</strong></p>${result.errorCode === 'NEEDS_UPDATE' ? '<p><button type="button" class="button primary" data-role="banner-update">Atualizar agora</button></p>' : ''}${result.detail ? `<pre class="review-markdown">${escapeHtml(result.detail)}</pre>` : ''}`
    };
    void renderDetail();
    return;
  }

  desktop.banner = { tone: result.conflicts.length > 0 ? 'warning' : 'success', html: `<p><strong>${escapeHtml(result.message)}</strong></p>` };

  if (result.changed.length > 0) {
    desktop.commitDraft = { key: `svn:${state.selectedEnvironmentId ?? ''}`, summary: `Desfaz r${entry.revision}: ${title}`, description: `Reverte as mudanças da revisão ${entry.revision}.` };
    desktop.tab = 'changes';
    desktop.selectedRevision = undefined;
  }

  await loadDesktop({ quiet: true });
}

function renderConflictBanner(): string {
  const conflicts = desktop.workingCopy?.conflicts ?? 0;

  if (conflicts === 0 || isCopyStep()) {
    return '';
  }

  return `<div class="banner" data-tone="error"><p><strong>${count(conflicts, 'arquivo', 'arquivos')} em conflito.</strong> ${plural(conflicts, 'Ele não pode ser commitado', 'Eles não podem ser commitados')}. Clique ${plural(conflicts, 'no arquivo', 'em cada arquivo')} marcado com ! para escolher como resolver.</p></div>`;
}

async function renderDetail(): Promise<void> {
  const detail = query<HTMLElement>('[data-role="detail"]');
  const requestId = ++desktop.requestId;

  if (!detail) {
    return;
  }

  if (!desktop.environments || desktop.environments.items.length === 0) {
    detail.innerHTML = blankSlate(
      'Comece adicionando um projeto',
      'Um projeto é uma pasta de checkout SVN. Faça checkout pela tela Repositórios ou escolha uma pasta que você já tem.',
      `<div class="suggestions">
        ${suggestion('Baixar um projeto do servidor', 'Navegue pelos repositórios SVN e faça checkout.', 'open-repositories-inline', 'Repositórios')}
        ${suggestion('Adicionar projeto existente', 'Escolha a pasta de um checkout SVN que você já tem.', 'add-environment', 'Adicionar…')}
      </div>`
    );
    bindDetailActions(detail);
    return;
  }

  const plan = desktop.screen?.plan;
  const gitLinked = Boolean(desktop.environments.selected?.gitWorkspacePath);

  if (desktop.tab === 'history') {
    if (desktop.selectedRevision) {
      renderRevisionDetail(detail, desktop.selectedRevision);
    } else {
      detail.innerHTML = `${renderBanner()}${blankSlate('Histórico', !desktop.log.loaded ? 'Carregando o histórico do servidor...' : desktop.log.entries.length > 0 ? 'Selecione um commit para ver a mensagem, os arquivos e o diff.' : 'Nenhum commit para mostrar.')}`;
    }
    return;
  }

  // Pasta do projeto apagada ou movida: oferece apontar a nova pasta ou tirar da lista.
  if (desktop.workingCopy?.errorCode === 'MISSING_FOLDER') {
    const folder = desktop.environments?.selected?.svnCheckoutPath ?? '';
    detail.innerHTML = `
      ${renderBanner()}
      ${blankSlate(
        'A pasta do projeto não existe mais',
        `O SVNFlow procurou em ${folder}. Ela pode ter sido movida, renomeada ou apagada.`,
        `<div class="suggestions">
           ${suggestion('Escolher a nova pasta', 'Aponte para onde o checkout está agora.', 'relocate-project', 'Escolher…')}
           ${suggestion('Remover da lista', 'Tira o projeto do SVNFlow. Nenhuma pasta é apagada.', 'remove-missing-project', 'Remover')}
         </div>`
      )}
    `;
    bindDetailActions(detail);
    return;
  }

  if (gitLinked && (!plan || plan.status === 'blocked')) {
    detail.innerHTML = `
      ${renderBanner()}
      ${blankSlate(
        'Sincronização bloqueada',
        desktop.screen?.message ?? 'Não foi possível ler o projeto.',
        `<div class="banner" data-tone="error"><ul>${(plan?.blockers ?? []).map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join('')}</ul></div>
         <div class="suggestions">
           ${suggestion('Abrir checkout SVN', 'Resolva conflitos ou problemas direto na pasta.', 'open-svn', 'Abrir pasta', { role: 'code-svn', label: 'Abrir no VS Code' })}
           ${suggestion('Revisar o Git vinculado', 'Confira o repositório Git e a branch base deste projeto.', 'link-git', 'Revisar…')}
         </div>`
      )}
    `;
    bindDetailActions(detail);
    return;
  }

  if (!isCopyStep() && desktop.workingCopy && !desktop.workingCopy.ok) {
    detail.innerHTML = `${renderBanner()}${blankSlate('Não foi possível ler o checkout', desktop.workingCopy.message, `<div class="banner" data-tone="error"><p>${escapeHtml(desktop.workingCopy.detail ?? '')}</p></div>`)}`;
    bindDetailActions(detail);
    return;
  }

  const items = currentChangeItems();
  const selected = items.find((item) => item.path === desktop.selectedPath);

  if (selected) {
    await renderDiffDetail(detail, selected, requestId);
    return;
  }

  const svnPath = desktop.screen?.environment?.svnCheckoutPath ?? '';
  const title = items.length === 0
    ? 'Nenhuma alteração'
    : isCopyStep() ? `${count(items.length, 'arquivo diferente', 'arquivos diferentes')} do Git` : `${count(items.length, 'alteração', 'alterações')} no checkout`;
  const message = items.length > 0
    ? (isCopyStep() ? 'Selecione um arquivo para ver o diff.' : 'Marque os arquivos que entram no commit e clique num arquivo para ver o diff.')
    : gitLinked ? plan?.message ?? '' : 'O checkout SVN não tem alterações locais.';

  detail.innerHTML = `
    ${renderBanner()}
    ${renderConflictBanner()}
    ${renderWarnings(plan)}
    ${blankSlate(
      title,
      message,
      `<div class="suggestions">
        ${suggestion('Abrir checkout SVN', svnPath, 'open-svn', 'Abrir pasta', { role: 'code-svn', label: 'Abrir no VS Code' })}
        ${gitLinked
          ? suggestion('Abrir repositório Git', plan?.gitWorkspacePath ?? '', 'open-git', 'Abrir pasta', { role: 'code-git', label: 'Abrir no VS Code' })
          : suggestion('Vincular repositório Git', 'Sincronize o último commit de um repositório Git com este checkout.', 'link-git', 'Vincular…')}
        ${items.length === 0 ? suggestion('Verificar novamente', 'Compare de novo depois de editar arquivos ou fazer um commit no Git.', 'refresh-detail', 'Verificar') : ''}
      </div>`
    )}
  `;
  bindDetailActions(detail);
}

function renderDesktop(): void {
  renderToolbar();
  renderSidebar();
  renderCommitBox();
  void renderDetail();
}

async function loadDesktop(options: { quiet?: boolean } = {}): Promise<void> {
  if (!options.quiet) {
    setStatusMessage('Verificando alterações...');
  }
  const refresh = query<HTMLButtonElement>('[data-role="refresh"]');

  if (refresh) {
    refresh.disabled = true;
  }

  try {
    desktop.environments = await api().getEnvironmentScreenState(state.selectedEnvironmentId);
    state.selectedEnvironmentId = desktop.environments.selectedEnvironmentId;

    // Compara com o projeto dos dados em tela: o menu troca state.selectedEnvironmentId
    // antes de chamar loadDesktop, então comparar com ele não detectava a troca.
    if (desktop.loadedEnvironmentId !== state.selectedEnvironmentId) {
      resetSelection();
      desktop.log = emptyHistoryLog();
      desktop.selectedRevision = undefined;
      desktop.selectedLogPath = undefined;
      desktop.selectedPath = undefined;
      desktop.incoming = undefined;
      desktop.commitDraft = undefined;
      desktop.showSvnChanges = false;
      desktop.loadedEnvironmentId = state.selectedEnvironmentId;
    }

    const hasEnvironment = desktop.environments.items.length > 0;
    desktop.screen = hasEnvironment ? await api().getSyncScreenState(state.selectedEnvironmentId) : undefined;

    desktop.workingCopy = hasEnvironment && !isCopyStep()
      ? await api().getWorkingCopyStatus(state.selectedEnvironmentId)
      : undefined;
    reconcileSelection();

    if (!currentChangeItems().some((item) => item.path === desktop.selectedPath)) {
      desktop.selectedPath = undefined;
    }

    if (!options.quiet) {
      setStatusMessage(isCopyStep() || !desktop.workingCopy ? desktop.screen?.message ?? 'Adicione um projeto para começar.' : desktop.workingCopy.message);
    }
  } catch (error) {
    setStatusMessage(`Falha ao carregar: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
  } finally {
    if (refresh) {
      refresh.disabled = false;
    }
  }

  renderDesktop();

  if (desktop.tab === 'history' && !desktop.log.loaded && state.selectedEnvironmentId) {
    void loadHistory();
  }

  void checkIncoming();
}

// Verificação em segundo plano: não abre login sozinha se o servidor pedir senha.
async function checkIncoming(): Promise<void> {
  const environmentId = state.selectedEnvironmentId;

  if (!environmentId) {
    desktop.incoming = undefined;
    renderToolbar();
    return;
  }

  const result = await api().getIncoming(environmentId);

  if (state.selectedEnvironmentId === environmentId) {
    desktop.incoming = result;
    renderToolbar();
  }
}

async function updateFromServer(): Promise<void> {
  const environmentId = state.selectedEnvironmentId;
  const localChanges = desktop.workingCopy?.changes.length ?? 0;
  const incoming = desktop.incoming?.incoming ?? 0;

  if (!environmentId) {
    return;
  }

  if (localChanges > 0 && !(await confirmModal({
    title: 'Atualizar do servidor',
    message: `${incoming > 0 ? `${count(incoming, 'revisão nova será baixada', 'revisões novas serão baixadas')}. ` : ''}O checkout tem ${count(localChanges, 'alteração local', 'alterações locais')}: o SVN junta as mudanças do servidor com as suas. Se a mesma linha mudou dos dois lados, o arquivo fica em conflito para você resolver.`,
    confirmLabel: 'Atualizar'
  }))) {
    return;
  }

  setStatusMessage('Atualizando o checkout com o servidor...');
  const refresh = query<HTMLButtonElement>('[data-role="refresh"]');
  if (refresh) {
    refresh.disabled = true;
  }

  const result = await withCredentials(desktop.workingCopy?.url ?? '', (credentials) => api().updateWorkingCopy(environmentId, credentials));

  desktop.banner = result.ok
    ? {
        tone: result.conflicts.length > 0 ? 'warning' : 'success',
        html: `<p><strong>${escapeHtml(result.message)}</strong></p>${result.conflicts.length > 0 ? `<ul>${result.conflicts.map((file) => `<li>${escapeHtml(file)}</li>`).join('')}</ul>` : ''}`
      }
    : { tone: 'error', html: `<p><strong>Não foi possível atualizar.</strong> ${escapeHtml(result.message)}</p>${result.detail ? `<pre class="review-markdown">${escapeHtml(result.detail)}</pre>` : ''}` };
  desktop.incoming = undefined;
  desktop.log = emptyHistoryLog();
  setStatusMessage(result.message);
  await loadDesktop({ quiet: true });
}


// Menu de projetos ---------------------------------------------------------

function closeMenus(): void {
  for (const [menu, picker] of [['environment-menu', 'environment-picker'], ['branch-menu', 'branch-picker']]) {
    query<HTMLElement>(`[data-role="${menu}"]`)?.setAttribute('hidden', '');
    query<HTMLElement>(`[data-role="${picker}"]`)?.setAttribute('aria-expanded', 'false');
  }
}

function toggleEnvironmentMenu(): void {
  const menu = query<HTMLElement>('[data-role="environment-menu"]');
  const picker = query<HTMLElement>('[data-role="environment-picker"]');

  if (!menu || !picker) {
    return;
  }

  if (!menu.hidden) {
    closeMenus();
    return;
  }

  closeMenus();
  const environments = desktop.environments;
  const items = (environments?.items ?? []).map((item) => `
    <li class="dropdown-row">
      <button type="button" class="dropdown-item" data-environment-id="${escapeHtml(item.id)}" aria-current="${item.id === environments?.selectedEnvironmentId}">
        <span class="dropdown-item-text"><span>${escapeHtml(item.name)}</span></span>
      </button>
      <button type="button" class="dropdown-remove" data-remove-environment="${escapeHtml(item.id)}" aria-label="Remover ${escapeHtml(item.name)} da lista" title="Remover da lista">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/></svg>
      </button>
    </li>
  `).join('');

  menu.innerHTML = `
    <div class="dropdown-header">Projetos</div>
    <ul class="dropdown-list">${items || '<li class="list-empty">Nenhum projeto cadastrado.</li>'}</ul>
    <div class="dropdown-footer">
      <button type="button" class="button primary" data-role="menu-add">Adicionar projeto…</button>
      ${environments?.selected ? `<button type="button" class="button" data-role="menu-link-git">${environments.selected.gitWorkspacePath ? 'Git vinculado…' : 'Vincular Git…'}</button>` : ''}
    </div>
  `;
  menu.hidden = false;
  picker.setAttribute('aria-expanded', 'true');

  bindClick(menu, '[data-environment-id]', async (button) => {
    closeMenus();

    // Escolher um projeto (inclusive o atual) sai da tela de Repositórios e abre a página dele.
    if (!query<HTMLElement>('[data-role="repos-view"]')?.hidden) {
      setActiveView('desktop');
    }

    state.selectedEnvironmentId = button.dataset.environmentId;
    desktop.selectedPath = undefined;
    desktop.selectedRevision = undefined;
    desktop.commitDraft = undefined;
    desktop.banner = undefined;
    await loadDesktop();
  });

  bindClick(menu, '[data-role="menu-link-git"]', () => {
    closeMenus();
    openLinkGitModal();
  });

  bindClick(menu, '[data-role="menu-add"]', () => {
    closeMenus();
    openAddEnvironmentModal();
  });

  bindClick(menu, '[data-remove-environment]', async (button) => {
    closeMenus();
    const target = desktop.environments?.items.find((item) => item.id === button.dataset.removeEnvironment);

    if (!target || !(await confirmModal({
      title: 'Remover projeto',
      message: `Remover "${target.name}" da lista? As pastas do checkout SVN e do Git não serão apagadas.`,
      confirmLabel: 'Remover',
      danger: true
    }))) {
      return;
    }

    await api().removeEnvironment(target.id);

    if (state.selectedEnvironmentId === target.id) {
      state.selectedEnvironmentId = undefined;
    }

    desktop.banner = undefined;
    await loadDesktop();
  });
}

// Menu de branches ----------------------------------------------------------

function renderBranchItem(branch: GitBranch, current?: string): string {
  const isCurrent = branch.kind === 'local' && branch.name === current;
  return `
    <li data-branch-filter="${escapeHtml(branch.name.toLowerCase())}">
      <button type="button" class="dropdown-item" data-branch="${escapeHtml(branch.name)}" data-kind="${branch.kind}" aria-current="${isCurrent}">
        <span class="branch-check" aria-hidden="true">${isCurrent ? '✓' : ''}</span>
        <span class="dropdown-item-text">
          <span>${escapeHtml(branch.name)}</span>
          <small>${escapeHtml(branch.shortCommit)}${branch.committedAt ? ` · ${escapeHtml(formatDate(branch.committedAt))}` : ''}</small>
        </span>
      </button>
    </li>
  `;
}

async function toggleBranchMenu(): Promise<void> {
  const menu = query<HTMLElement>('[data-role="branch-menu"]');
  const picker = query<HTMLElement>('[data-role="branch-picker"]');

  if (!menu || !picker) {
    return;
  }

  if (!menu.hidden) {
    closeMenus();
    return;
  }

  closeMenus();
  menu.style.left = `${picker.getBoundingClientRect().left}px`;
  menu.innerHTML = '<div class="dropdown-header">Branches</div><p class="list-empty">Carregando branches...</p>';
  menu.hidden = false;
  picker.setAttribute('aria-expanded', 'true');

  const branches = await api().listGitBranches(state.selectedEnvironmentId);

  if (menu.hidden) {
    return;
  }

  if (!branches.ok) {
    menu.innerHTML = `<div class="dropdown-header">Branches</div><p class="list-empty">${escapeHtml(branches.message)}</p>`;
    return;
  }

  menu.innerHTML = `
    <div class="dropdown-header">Trocar de branch${branches.detached ? ' (HEAD destacado)' : ''}</div>
    <div class="dropdown-filter"><input class="input" type="search" data-role="branch-filter" placeholder="Filtrar branches" aria-label="Filtrar branches" /></div>
    <div class="dropdown-scroll">
      <p class="dropdown-section">Locais</p>
      <ul class="dropdown-list">${branches.local.map((branch) => renderBranchItem(branch, branches.current)).join('') || '<li class="list-empty">Nenhuma.</li>'}</ul>
      ${branches.remote.length > 0 ? `<p class="dropdown-section">Remotas (cria uma branch local)</p><ul class="dropdown-list">${branches.remote.map((branch) => renderBranchItem(branch)).join('')}</ul>` : ''}
    </div>
    <p class="dropdown-note">Trocar de branch altera os arquivos do repositório Git. Alterações não commitadas bloqueiam a troca.</p>
  `;

  const filter = query<HTMLInputElement>('[data-role="branch-filter"]', menu)!;
  filter.focus();
  filter.addEventListener('input', () => {
    const term = filter.value.trim().toLowerCase();
    menu.querySelectorAll<HTMLElement>('[data-branch-filter]').forEach((item) => {
      item.hidden = term.length > 0 && !(item.dataset.branchFilter ?? '').includes(term);
    });
  });
  filter.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      menu.querySelector<HTMLButtonElement>('[data-branch-filter]:not([hidden]) [data-branch]')?.click();
    }
  });

  bindClick(menu, '[data-branch]', async (button) => {
    const branch = button.dataset.branch ?? '';
    const kind = button.dataset.kind === 'remote' ? 'remote' : 'local';
    closeMenus();

    if (kind === 'local' && branch === branches.current) {
      return;
    }

    setStatusMessage(`Trocando para ${branch}...`);
    const result = await api().switchGitBranch(state.selectedEnvironmentId, branch, kind);

    if (result.ok) {
      desktop.banner = { tone: 'success', html: `<p><strong>${escapeHtml(result.message)}</strong> O checkout SVN foi comparado com o último commit dessa branch.</p>` };
      desktop.selectedPath = undefined;
      desktop.commitDraft = undefined;
    } else {
      const files = (result.changedFiles ?? []).slice(0, 8).map((file) => `<li>${escapeHtml(file)}</li>`).join('');
      desktop.banner = {
        tone: 'error',
        html: `<p><strong>Branch não trocada.</strong> ${escapeHtml(result.message)}</p>${files ? `<ul>${files}</ul>` : ''}`
      };
    }

    await loadDesktop({ quiet: true });
    setStatusMessage(result.message);
  });
}

// Modais --------------------------------------------------------------------

let closeActiveModal: (() => void) | undefined;

function openModal(html: string): HTMLElement {
  const backdrop = query<HTMLElement>('[data-role="modal"]')!;
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  backdrop.hidden = false;
  return query<HTMLElement>('.modal', backdrop)!;
}

function closeModal(): void {
  const backdrop = query<HTMLElement>('[data-role="modal"]');

  if (backdrop) {
    backdrop.hidden = true;
    backdrop.innerHTML = '';
  }

  closeActiveModal = undefined;
}

function confirmModal(options: { title: string; message: string; detail?: string; confirmLabel: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = openModal(`
      <div class="modal-header">${escapeHtml(options.title)}</div>
      <div class="modal-body">
        <p>${escapeHtml(options.message)}</p>
        ${options.detail ? `<pre class="review-markdown">${escapeHtml(options.detail)}</pre>` : ''}
      </div>
      <div class="modal-footer">
        <button type="button" class="button" data-role="modal-cancel">Cancelar</button>
        <button type="button" class="button ${options.danger ? 'danger' : 'primary'}" data-role="modal-confirm">${escapeHtml(options.confirmLabel)}</button>
      </div>
    `);
    const finish = (value: boolean) => {
      closeModal();
      resolve(value);
    };

    closeActiveModal = () => finish(false);
    bindClick(modal, '[data-role="modal-cancel"]', () => finish(false));
    bindClick(modal, '[data-role="modal-confirm"]', () => finish(true));
    query<HTMLButtonElement>('[data-role="modal-confirm"]', modal)?.focus();
  });
}

function openAddEnvironmentModal(): void {
  const modal = openModal(`
    <form data-role="add-environment-form">
      <div class="modal-header">Adicionar projeto</div>
      <div class="modal-body">
        <label class="modal-field">Checkout SVN
          <span class="input-row">
            <input class="input" name="svnCheckoutPath" type="text" placeholder="Pasta de um checkout SVN existente" required />
            <button type="button" class="button" data-role="pick-svn">Escolher…</button>
          </span>
        </label>
        <label class="modal-field"><span>Repositório Git <small>(opcional)</small></span>
          <span class="input-row">
            <input class="input" name="gitWorkspacePath" type="text" placeholder="Vincule para sincronizar o código do Git com o SVN" />
            <button type="button" class="button" data-role="pick-git">Escolher…</button>
          </span>
          <small>Sem Git, o projeto funciona como cliente SVN: alterações, commit, histórico e atualização.</small>
        </label>
        <label class="modal-field">Nome
          <input class="input" name="name" type="text" placeholder="Usa o nome da pasta quando vazio" />
        </label>
        <p class="modal-error" data-role="add-environment-error" hidden></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="button" data-role="modal-cancel">Cancelar</button>
        <button type="submit" class="button primary">Adicionar projeto</button>
      </div>
    </form>
  `);
  const form = query<HTMLFormElement>('form', modal)!;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const error = query<HTMLElement>('[data-role="add-environment-error"]', modal)!;

  closeActiveModal = closeModal;
  bindClick(modal, '[data-role="modal-cancel"]', closeModal);
  bindClick(modal, '[data-role="pick-git"]', async () => {
    const selected = await api().selectDirectory('Selecionar repositório Git', input('gitWorkspacePath').value || undefined);
    if (selected) input('gitWorkspacePath').value = selected;
  });
  bindClick(modal, '[data-role="pick-svn"]', async () => {
    const selected = await api().selectDirectory('Selecionar checkout SVN', input('svnCheckoutPath').value || undefined);
    if (selected) input('svnCheckoutPath').value = selected;
  });
  input('svnCheckoutPath').focus();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const submit = query<HTMLButtonElement>('button[type="submit"]', form)!;
      submit.disabled = true;
      setStatusMessage('Validando o projeto...');

      const response = await api().registerEnvironment({
        name: input('name').value,
        gitWorkspacePath: input('gitWorkspacePath').value,
        svnCheckoutPath: input('svnCheckoutPath').value
      });

      if (!response.registration.canSave) {
        error.textContent = [response.registration.message, ...response.registration.blockers.map((blocker) => blocker.message)].join(' ');
        error.hidden = false;
        submit.disabled = false;
        setStatusMessage(response.registration.message);
        return;
      }

      closeModal();
      state.selectedEnvironmentId = response.registration.savedEnvironment?.id;
      desktop.selectedPath = undefined;
      desktop.commitDraft = undefined;
      desktop.banner = undefined;
      await loadDesktop();
    })();
  });
}

const THEME_OPTIONS: Array<{ value: AppTheme; label: string; description: string }> = [
  { value: 'system', label: 'Sistema', description: 'Segue o tema do sistema operacional.' },
  { value: 'light', label: 'Claro', description: 'Sempre claro.' },
  { value: 'dark', label: 'Escuro', description: 'Sempre escuro.' }
];

async function openAppearanceModal(): Promise<void> {
  const current = await api().getTheme();
  const modal = openModal(`
    <div class="modal-header">Aparência</div>
    <div class="modal-body">
      <p>Escolha o tema do SVNFlow. A mudança vale na hora e fica salva.</p>
      <div class="theme-options" role="radiogroup" aria-label="Tema">
        ${THEME_OPTIONS.map((option) => `
          <label class="theme-option">
            <input type="radio" name="theme" value="${option.value}" ${option.value === current ? 'checked' : ''} />
            <span class="theme-preview" data-theme-preview="${option.value}" aria-hidden="true"><span></span><span></span><span></span></span>
            <strong>${escapeHtml(option.label)}</strong>
            <small>${escapeHtml(option.description)}</small>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="button primary" data-role="modal-cancel">Fechar</button>
    </div>
  `);

  closeActiveModal = closeModal;
  bindClick(modal, '[data-role="modal-cancel"]', closeModal);
  modal.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      void api().setTheme(radio.value as AppTheme).then((theme) => {
        setStatusMessage(`Tema: ${THEME_OPTIONS.find((option) => option.value === theme)?.label ?? theme}.`);
      });
    });
  });
  query<HTMLButtonElement>('[data-role="modal-cancel"]', modal)?.focus();
}

function openLinkGitModal(): void {
  const selected = desktop.environments?.selected;

  if (!selected) {
    return;
  }

  const modal = openModal(`
    <form data-role="link-git-form">
      <div class="modal-header">Repositório Git de "${escapeHtml(selected.name)}"</div>
      <div class="modal-body">
        <p>Com um Git vinculado, a aba Alterações copia o último commit da branch atual para o checkout SVN antes do commit.</p>
        <label class="modal-field">Repositório Git
          <span class="input-row">
            <input class="input" name="gitWorkspacePath" type="text" placeholder="Pasta do repositório Git local" value="${escapeHtml(selected.gitWorkspacePath ?? '')}" required />
            <button type="button" class="button" data-role="pick-git">Escolher…</button>
          </span>
        </label>
        <p class="modal-error" data-role="link-git-error" hidden></p>
      </div>
      <div class="modal-footer">
        ${selected.gitWorkspacePath ? '<button type="button" class="button danger" data-role="unlink-git">Desvincular</button>' : ''}
        <button type="button" class="button" data-role="modal-cancel">Cancelar</button>
        <button type="submit" class="button primary">Vincular</button>
      </div>
    </form>
  `);
  const form = query<HTMLFormElement>('form', modal)!;
  const gitInput = form.elements.namedItem('gitWorkspacePath') as HTMLInputElement;
  const error = query<HTMLElement>('[data-role="link-git-error"]', modal)!;

  const save = async (gitWorkspacePath: string) => {
    const response = await api().linkGit(selected.id, gitWorkspacePath);

    if (!response.ok) {
      error.textContent = [response.message, ...response.blockers.map((blocker) => blocker.message)].join(' ');
      error.hidden = false;
      return;
    }

    closeModal();
    desktop.selectedPath = undefined;
    desktop.commitDraft = undefined;
    desktop.banner = { tone: 'success', html: `<p><strong>${escapeHtml(response.message)}</strong></p>` };
    await loadDesktop();
  };

  closeActiveModal = closeModal;
  bindClick(modal, '[data-role="modal-cancel"]', closeModal);
  bindClick(modal, '[data-role="pick-git"]', async () => {
    const picked = await api().selectDirectory('Selecionar repositório Git', gitInput.value || undefined);
    if (picked) gitInput.value = picked;
  });
  bindClick(modal, '[data-role="unlink-git"]', () => save(''));
  gitInput.focus();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void save(gitInput.value);
  });
}

// Troca de visão ------------------------------------------------------------

// Repositórios SVN -----------------------------------------------------------

interface ReposViewState {
  data?: RepositoriesState;
  rootUrl?: string;
  currentUrl?: string;
  listing?: RemoteListing;
  loading: boolean;
  // Texto da busca na pasta atual (filtra por nome ou, no histórico, por mensagem e autor).
  search: string;
  // Histórico remoto da pasta atual, sem precisar de checkout.
  showHistory: boolean;
  history?: { url: string; entries: SvnXmlLogEntry[]; hasMore: boolean; projectPath?: string; error?: string; loading: boolean };
  expandedRevision?: string;
}

const repos: ReposViewState = { loading: false, showHistory: false, search: '' };

function svnUrlBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function suggestNameFromUrl(url: string): string {
  const segments = svnUrlBase(url).split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? 'projeto';
  return decodeURIComponent(last === 'trunk' && segments.length > 1 ? segments[segments.length - 2] : last);
}

// Pede usuário e senha quando o servidor exige. A senha fica só na memória da sessão.
function askCredentials(url: string, failedBefore: boolean): Promise<SvnCredentials | undefined> {
  return new Promise((resolve) => {
    const host = url.match(/^[a-z+]+:\/\/([^/]+)/i)?.[1] ?? url;
    const modal = openModal(`
      <form data-role="credentials-form">
        <div class="modal-header">Entrar no servidor SVN</div>
        <div class="modal-body">
          <p>O servidor <strong>${escapeHtml(host)}</strong> pediu usuário e senha.</p>
          ${failedBefore ? '<p class="modal-error">Usuário ou senha não aceitos. Tente de novo.</p>' : ''}
          <label class="modal-field">Usuário
            <input class="input" name="username" type="text" autocomplete="username" required />
          </label>
          <label class="modal-field">Senha
            <input class="input" name="password" type="password" autocomplete="current-password" required />
            <small>O SVNFlow mantém a senha só enquanto o app estiver aberto. O SVN pode guardá-la no cache dele, conforme a configuração da máquina.</small>
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="button" data-role="modal-cancel">Cancelar</button>
          <button type="submit" class="button primary">Entrar</button>
        </div>
      </form>
    `);
    const form = query<HTMLFormElement>('form', modal)!;
    const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value;
    const finish = (credentials: SvnCredentials | undefined) => {
      closeModal();
      resolve(credentials);
    };

    closeActiveModal = () => finish(undefined);
    bindClick(modal, '[data-role="modal-cancel"]', () => finish(undefined));
    (form.elements.namedItem('username') as HTMLInputElement).focus();
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      finish({ username: value('username'), password: value('password') });
    });
  });
}

// Executa a operação e, se o servidor pedir login, pergunta e tenta de novo.
async function withCredentials<T extends { errorCode?: string }>(url: string, run: (credentials?: SvnCredentials) => Promise<T>): Promise<T> {
  let result = await run();

  for (let attempt = 0; attempt < 3 && result.errorCode === 'AUTH_REQUIRED'; attempt += 1) {
    const credentials = await askCredentials(url, attempt > 0);

    if (!credentials) {
      return result;
    }

    result = await run(credentials);
  }

  return result;
}

// Pasta padrão de checkout: cada projeto é sugerido como subpasta dela.
async function chooseCheckoutDirectory(): Promise<string | undefined> {
  const current = repos.data?.defaultCheckoutDirectory || undefined;
  const picked = await api().selectDirectory('Escolher a pasta padrão para os checkouts', current);

  if (!picked) {
    return undefined;
  }

  const saved = await api().setCheckoutDirectory(picked);
  repos.data = { ...(repos.data ?? { roots: [] }), defaultCheckoutDirectory: saved };
  renderRepoRoots();
  setStatusMessage(`Pasta padrão de checkout: ${saved}`);
  return saved;
}

function renderRepoRoots(): void {
  const container = query<HTMLElement>('[data-role="repo-roots"]');
  const roots = repos.data?.roots ?? [];
  const folder = query<HTMLElement>('[data-role="checkout-folder"]');

  if (folder) {
    folder.textContent = repos.data?.defaultCheckoutDirectory ?? '';
    folder.title = folder.textContent;
  }

  if (!container) {
    return;
  }

  container.innerHTML = roots.length === 0
    ? '<p class="list-empty">Nenhuma URL cadastrada. Adicione a URL base do servidor SVN.</p>'
    : roots.map((root) => `
      <div class="root-row" aria-selected="${root.url === repos.rootUrl}">
        <button type="button" class="root-open" data-root-url="${escapeHtml(root.url)}" title="${escapeHtml(root.url)}">
          <span class="history-title">${escapeHtml(root.name)}</span>
          <span class="history-meta">${escapeHtml(root.url)}</span>
        </button>
        <button type="button" class="root-remove" data-remove-root="${escapeHtml(root.url)}" aria-label="Remover ${escapeHtml(root.name)}" title="Remover">×</button>
      </div>
    `).join('');

  bindClick(container, '[data-root-url]', (button) => {
    repos.rootUrl = button.dataset.rootUrl;
    void browseRemote(button.dataset.rootUrl ?? '');
  });

  bindClick(container, '[data-remove-root]', async (button) => {
    const url = button.dataset.removeRoot ?? '';
    const root = roots.find((item) => item.url === url);

    if (!root || !(await confirmModal({ title: 'Remover URL', message: `Remover "${root.name}" da lista? Nenhum checkout é apagado.`, confirmLabel: 'Remover', danger: true }))) {
      return;
    }

    const next = await api().saveRepositoryRoots(roots.filter((item) => item.url !== url));
    repos.data = { ...repos.data!, roots: next };

    if (repos.rootUrl === url) {
      repos.rootUrl = undefined;
      repos.currentUrl = undefined;
      repos.listing = undefined;
    }

    renderRepoRoots();
    renderRepoBrowser();
  });
}

function breadcrumb(): string {
  const root = (repos.data?.roots ?? []).find((item) => item.url === repos.rootUrl);
  const current = repos.currentUrl ?? '';

  if (!root || !current.startsWith(root.url)) {
    return escapeHtml(current);
  }

  const parts = current.slice(root.url.length).split('/').filter(Boolean);
  const links = [`<button type="button" class="crumb" data-crumb="${escapeHtml(root.url)}">${escapeHtml(root.name)}</button>`];
  let url = root.url;

  for (const part of parts) {
    url = `${url}/${part}`;
    links.push(`<span class="crumb-sep">/</span><button type="button" class="crumb" data-crumb="${escapeHtml(url)}">${escapeHtml(decodeURIComponent(part))}</button>`);
  }

  return links.join('');
}

function renderRepoBrowser(): void {
  const detail = query<HTMLElement>('[data-role="repo-browser"]');

  if (!detail) {
    return;
  }

  if (!repos.currentUrl) {
    detail.innerHTML = blankSlate(
      'Repositórios SVN',
      (repos.data?.roots.length ?? 0) > 0
        ? 'Escolha um servidor na lista para ver os projetos.'
        : 'Adicione a URL base do servidor SVN da sua equipe. Ela fica salva só neste computador.',
      `<div class="suggestions">${suggestion('Adicionar URL', 'Exemplo: svn://servidor/caminho/projetos', 'add-root-inline', 'Adicionar…')}</div>`
    );
    bindClick(detail, '[data-role="add-root-inline"]', () => openAddRootModal());
    return;
  }

  const listing = repos.listing;
  const header = `
    <div class="diff-header repo-header">
      <span class="breadcrumb">${breadcrumb()}</span>
      <input class="input repo-search" type="search" data-role="repo-search" placeholder="${repos.showHistory ? 'Buscar no histórico' : 'Buscar nesta pasta'}" value="${escapeHtml(repos.search)}" aria-label="Buscar" />
      <span class="diff-header-source">
        <button type="button" class="button" data-role="toggle-remote-history">${repos.showHistory ? 'Ver arquivos' : 'Ver histórico'}</button>
        <button type="button" class="button" data-role="checkout-current">Fazer checkout desta pasta…</button>
      </span>
    </div>
  `;
  let body: string;

  if (repos.showHistory) {
    body = renderRemoteHistory();
  } else if (repos.loading) {
    body = '<p class="list-empty">Carregando...</p>';
  } else if (!listing || !listing.ok) {
    body = `<div class="banner" data-tone="error"><p><strong>${escapeHtml(listing?.message ?? 'Não foi possível listar.')}</strong></p>${listing?.detail ? `<p>${escapeHtml(listing.detail)}</p>` : ''}</div>`;
  } else {
    const layout = listing.layout.trunk
      ? `<div class="banner" data-tone="success"><p>Este projeto segue o padrão <strong>trunk/branches/tags</strong>. O desenvolvimento principal fica em <strong>trunk</strong>.</p><p><button type="button" class="button primary" data-role="checkout-trunk">Fazer checkout do trunk…</button></p></div>`
      : '';
    const rows = listing.entries.map((entry) => `
      <tr data-filter="${escapeHtml(entry.name.toLowerCase())}">
        <td class="repo-name">
          ${entry.kind === 'dir'
            ? `<button type="button" class="link-button" data-open-dir="${escapeHtml(entry.url)}"><span class="repo-icon" aria-hidden="true">📁</span>${escapeHtml(entry.name)}</button>`
            : `<span class="repo-icon" aria-hidden="true">📄</span>${escapeHtml(entry.name)}`}
        </td>
        <td>${escapeHtml(entry.revision ? `r${entry.revision}` : '')}</td>
        <td>${escapeHtml(entry.author ?? '')}</td>
        <td>${escapeHtml(formatDate(entry.date))}</td>
        <td>${entry.kind === 'dir' ? `<button type="button" class="button" data-checkout-url="${escapeHtml(entry.url)}">Checkout…</button>` : ''}</td>
      </tr>
    `).join('');

    body = `
      ${layout}
      ${listing.entries.length === 0
        ? '<p class="list-empty">Pasta vazia.</p>'
        : `<table class="history-table repo-table"><thead><tr><th>Nome</th><th>Revisão</th><th>Autor</th><th>Última alteração</th><th></th></tr></thead><tbody>${rows}</tbody></table>`}
    `;
  }

  detail.innerHTML = `${header}<div class="repo-body">${body}<p class="list-empty" data-role="repo-no-results" hidden>Nada encontrado para a busca.</p></div>`;

  const search = query<HTMLInputElement>('[data-role="repo-search"]', detail)!;
  search.addEventListener('input', () => {
    repos.search = search.value;
    applyRepoSearch(detail);
  });
  applyRepoSearch(detail);

  bindClick(detail, '[data-crumb]', (button) => browseRemote(button.dataset.crumb ?? ''));
  bindClick(detail, '[data-open-dir]', (button) => browseRemote(button.dataset.openDir ?? ''));
  bindClick(detail, '[data-checkout-url]', (button) => openCheckoutModal(button.dataset.checkoutUrl ?? ''));
  bindClick(detail, '[data-role="checkout-current"]', () => openCheckoutModal(repos.currentUrl ?? ''));
  bindClick(detail, '[data-role="checkout-trunk"]', () => openCheckoutModal(`${svnUrlBase(repos.currentUrl ?? '')}/trunk`));
  bindClick(detail, '[data-role="toggle-remote-history"]', () => {
    repos.showHistory = !repos.showHistory;
    if (repos.showHistory && repos.history?.url !== repos.currentUrl) {
      void loadRemoteHistory(false);
    }
    renderRepoBrowser();
  });
  bindClick(detail, '[data-role="remote-history-more"]', () => loadRemoteHistory(true));
  bindClick(detail, '[data-checkout-revision]', (button) => {
    if (repos.history?.url) {
      void openCheckoutModal(repos.history.url, button.dataset.checkoutRevision);
    }
  });
  bindClick(detail, '[data-expand-revision]', (button) => {
    repos.expandedRevision = repos.expandedRevision === button.dataset.expandRevision ? undefined : button.dataset.expandRevision;
    renderRepoBrowser();
  });
}

function renderRemoteHistory(): string {
  const history = repos.history;

  if (!history || (history.loading && history.entries.length === 0)) {
    return '<p class="list-empty">Carregando histórico...</p>';
  }

  if (history.error) {
    return `<div class="banner" data-tone="error"><p>${escapeHtml(history.error)}</p></div>`;
  }

  if (history.entries.length === 0) {
    return '<p class="list-empty">Nenhum commit nesta pasta.</p>';
  }

  const rows = history.entries.map((entry) => {
    const expanded = repos.expandedRevision === entry.revision;
    const projectPath = history.projectPath;
    const files = expanded
      ? `<tr class="remote-history-detail" data-detail-of="${escapeHtml(entry.revision)}"><td colspan="4">
          ${entry.message.includes('\n') ? `<p class="commit-message-view">${escapeHtml(entry.message.split('\n').slice(1).join('\n').trim())}</p>` : ''}
          <ul class="path-list">${entry.paths.filter((item) => item.kind !== 'dir' || item.action === 'D').map((item) => {
            const kind = LOG_ACTION_KIND[item.action] ?? 'modified';
            const shown = projectPath && projectPath !== '/' && item.path.startsWith(`${projectPath}/`) ? item.path.slice(projectPath.length + 1) : item.path;
            return `<li><span class="change-icon" data-kind="${kind}">${CHANGE_ICONS[kind]}</span>${escapeHtml(shown)}</li>`;
          }).join('')}</ul>
          <p><button type="button" class="button small" data-checkout-revision="${escapeHtml(entry.revision)}">Checkout nesta revisão…</button></p>
        </td></tr>`
      : '';

    return `
      <tr data-filter="${escapeHtml(`${entry.message} ${entry.author ?? ''} r${entry.revision}`.toLowerCase())}">
        <td><button type="button" class="link-button" data-expand-revision="${escapeHtml(entry.revision)}" aria-expanded="${expanded}">${escapeHtml(firstLine(entry.message) || '(sem mensagem)')}</button></td>
        <td>r${escapeHtml(entry.revision)}</td>
        <td>${escapeHtml(entry.author ?? '')}</td>
        <td>${escapeHtml(formatDate(entry.date))}</td>
      </tr>
      ${files}
    `;
  }).join('');

  return `
    <table class="history-table repo-table"><thead><tr><th>Mensagem</th><th>Revisão</th><th>Autor</th><th>Data</th></tr></thead><tbody>${rows}</tbody></table>
    ${history.hasMore ? `<p class="list-empty"><button type="button" class="button" data-role="remote-history-more" ${history.loading ? 'disabled' : ''}>${history.loading ? 'Carregando...' : 'Carregar mais'}</button></p>` : ''}
  `;
}

async function loadRemoteHistory(more: boolean): Promise<void> {
  const url = repos.currentUrl;

  if (!url) {
    return;
  }

  const current = more && repos.history?.url === url ? repos.history : { url, entries: [], hasMore: false, loading: false };
  const last = current.entries[current.entries.length - 1];
  current.loading = true;
  repos.history = current;
  renderRepoBrowser();

  const page = await withCredentials(url, (credentials) =>
    api().readSvnLog({ url, before: more && last ? String(Number(last.revision) - 1) : undefined, credentials })
  );

  if (repos.currentUrl !== url) {
    return;
  }

  current.loading = false;
  current.error = page.ok ? undefined : [page.message, page.detail].filter(Boolean).join(' ');
  current.entries = page.ok ? [...current.entries, ...page.entries] : current.entries;
  current.hasMore = page.ok && page.hasMore;
  current.projectPath = page.projectPath;
  setStatusMessage(page.message);
  renderRepoBrowser();
}

// Filtra as linhas já desenhadas, sem redesenhar (o campo de busca não perde o foco).
function applyRepoSearch(detail: HTMLElement): void {
  const term = repos.search.trim().toLowerCase();
  let visible = 0;
  let total = 0;

  detail.querySelectorAll<HTMLElement>('tr[data-filter]').forEach((row) => {
    const match = !term || (row.dataset.filter ?? '').includes(term);
    row.hidden = !match;
    total += 1;
    visible += match ? 1 : 0;
    const detailRow = row.nextElementSibling as HTMLElement | null;
    if (detailRow?.matches('.remote-history-detail')) {
      detailRow.hidden = !match;
    }
  });

  const empty = query<HTMLElement>('[data-role="repo-no-results"]', detail);
  if (empty) {
    empty.hidden = !(term && total > 0 && visible === 0);
  }
}

async function browseRemote(url: string): Promise<void> {
  if (!url) {
    return;
  }

  repos.currentUrl = svnUrlBase(url);
  repos.loading = true;
  repos.showHistory = false;
  repos.expandedRevision = undefined;
  repos.search = '';
  renderRepoRoots();
  renderRepoBrowser();
  setStatusMessage(`Listando ${repos.currentUrl}...`);

  repos.listing = await withCredentials(repos.currentUrl, (credentials) => api().listRemote(repos.currentUrl!, credentials));
  repos.loading = false;
  setStatusMessage(repos.listing.message);
  renderRepoBrowser();
}

function openAddRootModal(): void {
  const modal = openModal(`
    <form data-role="add-root-form">
      <div class="modal-header">Adicionar servidor SVN</div>
      <div class="modal-body">
        <label class="modal-field">URL base
          <input class="input" name="url" type="text" placeholder="svn://servidor/caminho/projetos" required />
          <small>Os projetos que estão dentro desta URL aparecem para checkout. A URL fica salva só neste computador.</small>
        </label>
        <label class="modal-field">Nome
          <input class="input" name="name" type="text" placeholder="Ex.: Projetos da equipe" />
        </label>
        <p class="modal-error" data-role="add-root-error" hidden></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="button" data-role="modal-cancel">Cancelar</button>
        <button type="submit" class="button primary">Adicionar</button>
      </div>
    </form>
  `);
  const form = query<HTMLFormElement>('form', modal)!;
  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value.trim();
  const error = query<HTMLElement>('[data-role="add-root-error"]', modal)!;

  closeActiveModal = closeModal;
  bindClick(modal, '[data-role="modal-cancel"]', closeModal);
  (form.elements.namedItem('url') as HTMLInputElement).focus();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const url = svnUrlBase(value('url'));

      if (!/^(svn|svn\+ssh|https?|file):\/\/\S+$/i.test(url)) {
        error.textContent = 'Informe uma URL SVN começando com svn://, svn+ssh://, http://, https:// ou file://.';
        error.hidden = false;
        return;
      }

      const roots = [...(repos.data?.roots ?? []), { name: value('name') || suggestNameFromUrl(url), url }];
      const saved = await api().saveRepositoryRoots(roots);
      repos.data = { ...(repos.data ?? { defaultCheckoutDirectory: '' }), roots: saved };
      closeModal();
      repos.rootUrl = url;
      renderRepoRoots();
      await browseRemote(url);
    })();
  });
}

async function openCheckoutModal(url: string, revision?: string): Promise<void> {
  // Aberto pelo Histórico, a tela de Repositórios pode ainda não ter carregado a pasta padrão.
  repos.data ??= await api().getRepositoriesState();
  const name = revision ? `${suggestNameFromUrl(url)}-r${revision}` : suggestNameFromUrl(url);
  const defaultDirectory = repos.data?.defaultCheckoutDirectory ?? '';
  const modal = openModal(`
    <form data-role="checkout-form">
      <div class="modal-header">${revision ? `Checkout na revisão ${escapeHtml(revision)}` : 'Fazer checkout'}</div>
      <div class="modal-body">
        <label class="modal-field">URL
          <input class="input" type="text" value="${escapeHtml(url)}" readonly />
        </label>
        <label class="modal-field">Pasta de destino
          <span class="input-row">
            <input class="input" name="destination" type="text" value="${escapeHtml(defaultDirectory ? `${defaultDirectory}/${name}` : '')}" required />
            <button type="button" class="button" data-role="pick-destination">Escolher…</button>
          </span>
          <small>A pasta não pode existir com arquivos dentro. Ela será criada se não existir.</small>
        </label>
        <label class="modal-field">Nome do projeto
          <input class="input" name="name" type="text" value="${escapeHtml(name)}" />
        </label>
        ${revision ? `<p class="modal-hint">O projeto vem como estava na revisão ${escapeHtml(revision)}, numa pasta separada. Para trazer as mudanças mais novas depois, use Atualizar do servidor.</p>` : ''}
        <label class="modal-check" data-role="save-default-field" hidden>
          <input type="checkbox" name="saveDefault" />
          <span>Usar <strong data-role="picked-folder"></strong> como pasta padrão dos próximos checkouts</span>
        </label>
        <p class="checkout-progress" data-role="checkout-progress" hidden></p>
        <p class="modal-error" data-role="checkout-error" hidden></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="button" data-role="modal-cancel">Cancelar</button>
        <button type="submit" class="button primary">Fazer checkout</button>
      </div>
    </form>
  `);
  const form = query<HTMLFormElement>('form', modal)!;
  const input = (field: string) => form.elements.namedItem(field) as HTMLInputElement;
  const progress = query<HTMLElement>('[data-role="checkout-progress"]', modal)!;
  const error = query<HTMLElement>('[data-role="checkout-error"]', modal)!;
  const submit = query<HTMLButtonElement>('button[type="submit"]', form)!;
  let running = false;

  closeActiveModal = () => {
    if (!running) {
      closeModal();
    }
  };
  bindClick(modal, '[data-role="modal-cancel"]', () => closeActiveModal?.());
  let pickedFolder: string | undefined;
  const saveDefaultField = query<HTMLElement>('[data-role="save-default-field"]', modal)!;
  bindClick(modal, '[data-role="pick-destination"]', async () => {
    const picked = await api().selectDirectory('Escolher a pasta onde o projeto será baixado', defaultDirectory || undefined);

    if (picked) {
      pickedFolder = picked.replace(/\/+$/, '');
      input('destination').value = `${pickedFolder}/${input('name').value.trim() || name}`;
      // Pasta diferente da padrão: oferece salvar como nova padrão.
      saveDefaultField.hidden = pickedFolder === defaultDirectory;
      setText('picked-folder', pickedFolder);
    }
  });

  // O nome do projeto acompanha a pasta de destino enquanto ela segue o padrão "<pasta>/<nome>".
  input('name').addEventListener('input', () => {
    const base = pickedFolder ?? defaultDirectory;
    const destination = input('destination').value.trim();
    if (base && destination.startsWith(`${base}/`) && !destination.slice(base.length + 1).includes('/')) {
      input('destination').value = `${base}/${input('name').value.trim() || name}`;
    }
  });
  input('destination').focus();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const operationId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const stop = api().onSvnProgress((update) => {
        if (update.operationId === operationId) {
          progress.textContent = `${count(update.files, 'item baixado', 'itens baixados')} · ${update.line}`;
        }
      });

      if (pickedFolder && (form.elements.namedItem('saveDefault') as HTMLInputElement).checked) {
        const saved = await api().setCheckoutDirectory(pickedFolder);
        repos.data = { ...(repos.data ?? { roots: [] }), defaultCheckoutDirectory: saved };
        renderRepoRoots();
      }

      running = true;
      submit.disabled = true;
      error.hidden = true;
      progress.hidden = false;
      progress.textContent = 'Conectando ao servidor...';
      setStatusMessage(`Fazendo checkout de ${url}...`);

      const response = await withCredentials(url, async (credentials) => {
        const result = await api().checkout({
          operationId,
          url,
          destination: input('destination').value.trim(),
          name: input('name').value.trim() || undefined,
          revision,
          credentials
        });
        return { ...result, errorCode: result.checkout.errorCode };
      });

      stop();
      running = false;

      if (!response.checkout.ok || !response.registration?.canSave) {
        error.textContent = response.checkout.ok
          ? `Checkout feito, mas o projeto não foi cadastrado: ${response.registration?.message ?? ''}`
          : [response.checkout.message, response.checkout.detail].filter(Boolean).join(' ');
        error.hidden = false;
        progress.hidden = true;
        submit.disabled = false;
        setStatusMessage(response.checkout.message);
        return;
      }

      closeModal();
      state.selectedEnvironmentId = response.registration.savedEnvironment?.id;
      desktop.selectedPath = undefined;
      desktop.commitDraft = undefined;
      desktop.banner = { tone: 'success', html: `<p><strong>${escapeHtml(response.checkout.message)}</strong> Projeto adicionado.</p>` };
      showDesktopView();
    })();
  });
}

async function showRepositoriesView(): Promise<void> {
  setActiveView('repos');
  repos.data = await api().getRepositoriesState();
  renderRepoRoots();
  renderRepoBrowser();
}

type ActiveView = 'desktop' | 'repos';

function setActiveView(view: ActiveView): void {
  closeMenus();
  query<HTMLElement>('[data-role="desktop-view"]')!.hidden = view !== 'desktop';
  query<HTMLElement>('[data-role="repos-view"]')!.hidden = view !== 'repos';
  query<HTMLElement>('[data-role="open-repositories"]')?.setAttribute('aria-pressed', String(view === 'repos'));
}

function showDesktopView(): void {
  setActiveView('desktop');
  void loadDesktop();
}

function bindDesktopShell(): void {
  bindSidebar();

  query<HTMLButtonElement>('[data-role="environment-picker"]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleEnvironmentMenu();
  });

  query<HTMLButtonElement>('[data-role="branch-picker"]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    void toggleBranchMenu();
  });

  query<HTMLButtonElement>('[data-role="refresh"]')?.addEventListener('click', (event) => {
    if ((event.currentTarget as HTMLElement).dataset.mode === 'update') {
      void updateFromServer();
      return;
    }

    desktop.banner = undefined;
    desktop.log = emptyHistoryLog();
    void loadDesktop();
  });

  query<HTMLButtonElement>('[data-role="open-repositories"]')?.addEventListener('click', () => {
    if (!query<HTMLElement>('[data-role="repos-view"]')!.hidden) {
      showDesktopView();
      return;
    }

    void showRepositoriesView();
  });

  query<HTMLButtonElement>('[data-role="add-root"]')?.addEventListener('click', () => openAddRootModal());
  query<HTMLButtonElement>('[data-role="busy-cancel"]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    const cancelled = await api().cancelSvnOperations();
    setText('busy-label', cancelled > 0 ? 'Cancelando…' : 'Esta etapa não pode ser interrompida. Aguarde…');
  });
  query<HTMLButtonElement>('[data-role="change-checkout-folder"]')?.addEventListener('click', () => void chooseCheckoutDirectory());

  query<HTMLButtonElement>('[data-role="appearance"]')?.addEventListener('click', () => {
    closeMenus();
    void openAppearanceModal();
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    const openMenu = Array.from(document.querySelectorAll<HTMLElement>('.dropdown')).find((menu) => !menu.hidden);
    if (openMenu && !openMenu.contains(target)) {
      closeMenus();
    }
  });

  query<HTMLElement>('[data-role="detail"]')?.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-role="close-diff"]')) {
      closeDiff();
    }
  });

  document.addEventListener('mousedown', (event) => {
    if (!(event.target as HTMLElement).closest('.context-menu')) {
      closeContextMenu();
    }
  });
  window.addEventListener('blur', closeContextMenu);

  // Volta para a janela: relê o checkout (como o GitHub Desktop), sem atropelar
  // modal aberto, operação em andamento ou outra tela.
  let lastAutoRefresh = 0;
  window.addEventListener('focus', () => {
    const busy = !query<HTMLElement>('[data-role="busy-indicator"]')?.hidden;
    const onDesktop = !query<HTMLElement>('[data-role="desktop-view"]')?.hidden;

    if (!busy && onDesktop && !closeActiveModal && state.selectedEnvironmentId && Date.now() - lastAutoRefresh > 3000) {
      lastAutoRefresh = Date.now();
      void loadDesktop({ quiet: true });
    }
  });

  // Revisões novas no servidor, de tempos em tempos (sem pedir login sozinho).
  window.setInterval(() => {
    if (state.selectedEnvironmentId && document.visibilityState === 'visible') {
      void checkIncoming();
    }
  }, 5 * 60 * 1000);

  document.addEventListener('keydown', (event) => {
    const typing = (event.target as HTMLElement).closest('input, textarea');
    const ctrl = event.ctrlKey || event.metaKey;

    // F5 ou Ctrl+R: verificar alterações. Ctrl+1 / Ctrl+2: abas. Ctrl+Enter: publicar.
    if (event.key === 'F5' || (ctrl && event.key.toLowerCase() === 'r')) {
      event.preventDefault();
      if (!closeActiveModal) {
        query<HTMLButtonElement>('[data-role="refresh"]')?.click();
      }
      return;
    }

    if (ctrl && (event.key === '1' || event.key === '2') && !closeActiveModal) {
      event.preventDefault();
      query<HTMLButtonElement>(`.tab[data-tab="${event.key === '1' ? 'changes' : 'history'}"]`)?.click();
      return;
    }

    if (ctrl && event.key === 'Enter' && !closeActiveModal && (!typing || typing.closest('[data-role="commit-box"]'))) {
      const submit = query<HTMLButtonElement>('[data-role="commit-svn"], [data-role="copy-to-svn"]');
      if (submit && !submit.disabled) {
        event.preventDefault();
        submit.click();
      }
      return;
    }

    if (event.key === 'Escape') {
      const target = event.target as HTMLElement;
      const hadOverlay = Boolean(document.querySelector('.context-menu') || closeActiveModal
        || Array.from(document.querySelectorAll<HTMLElement>('.dropdown')).some((menu) => !menu.hidden));
      closeContextMenu();
      closeMenus();
      closeActiveModal?.();

      // Sem menu ou modal aberto, Esc fecha o diff (fora de campos de texto).
      if (!hadOverlay && !target.closest('input, textarea')) {
        closeDiff();
      }
    }
  });
}

function renderAppBootstrap(): void {
  const version = query<HTMLElement>('[data-role="app-version"]');

  if (version) {
    version.textContent = `SVNFlow ${window.svnflowDesktop?.appVersion ?? 'dev'}`;
  }

  bindDesktopShell();
  showDesktopView();
}

// Reajusta os caminhos longos depois de cada renderização e ao redimensionar a janela.
function watchChangePaths(): void {
  let scheduled = false;
  const schedule = (): void => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        fitChangePaths();
      });
    }
  };

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
}

window.addEventListener('DOMContentLoaded', () => {
  watchChangePaths();
  renderAppBootstrap();
});

export {};
