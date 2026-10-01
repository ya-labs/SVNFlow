import type {
  ApplyPlan,
  ApplySourceRequest,
  CommitScreenState,
  EnvironmentScreenState,
  EnvironmentVisualStatus,
  ExecuteApplyResult,
  ImportPackageResult,
  MiniPrDraft,
  PackageHistoryResult,
  PackagesScreenState,
  PreviewScreenState,
  ScreenAlert,
  ScreenBlocker,
  ScreenWorkspaceFile,
  SvnflowDesktopApi,
  SyncPlan,
  SyncScreenState,
  WorkspaceScreenState
} from '../shared/ipc-types.js';

declare global {
  interface Window {
    svnflowDesktop?: SvnflowDesktopApi;
  }
}

type StageKey = 'environment' | 'workspace' | 'preview' | 'packages' | 'apply' | 'commit' | 'history';

interface StageDefinition {
  key: StageKey;
  label: string;
  description: string;
  helper: string;
  advanced?: boolean;
}

const STAGES: StageDefinition[] = [
  {
    key: 'environment',
    label: 'Ambiente',
    description: 'Cadastre, selecione e valide o par workspace Git e checkout SVN usado no fluxo.',
    helper: 'Cadastro e validação local.'
  },
  {
    key: 'history',
    label: 'Histórico',
    description: 'Eventos locais de sincronização, commit e pacotes.',
    helper: 'Registro local.'
  },
  {
    key: 'workspace',
    label: 'Workspace Git',
    description: 'Estado do workspace Git: branch atual, base de comparação e arquivos alterados.',
    helper: 'Leitura do Git local.',
    advanced: true
  },
  {
    key: 'preview',
    label: 'Preview',
    description: 'Revisão técnica da alteração antes de aplicar no SVN ou gerar pacote. Nada é alterado nesta etapa.',
    helper: 'Revisão técnica do workspace.',
    advanced: true
  },
  {
    key: 'packages',
    label: 'Pacotes',
    description: 'Crie pacotes .svnflow com mini PR, liste a pasta local e abra pacotes recebidos para revisão.',
    helper: 'Exportar, listar e importar.',
    advanced: true
  },
  {
    key: 'apply',
    label: 'Aplicação SVN',
    description: 'Aplica o patch no checkout SVN local após pré-validação e confirmação. Não publica commit.',
    helper: 'Altera arquivos locais.',
    advanced: true
  },
  {
    key: 'commit',
    label: 'Commit SVN',
    description: 'Publicação oficial no SVN com validação e confirmação explícita.',
    helper: 'Publicação protegida.',
    advanced: true
  }
];

const ADVANCED_STORAGE_KEY = 'svnflow.showAdvanced';

const STATUS_LABELS: Record<EnvironmentVisualStatus, string> = {
  ready: 'Pronto',
  attention: 'Atenção',
  blocked: 'Bloqueado',
  error: 'Erro',
  pending: 'Pendente'
};

const HISTORY_KIND_LABELS: Record<string, { label: string; kind: EnvironmentVisualStatus }> = {
  exported: { label: 'Exportado', kind: 'ready' },
  imported: { label: 'Importado', kind: 'pending' },
  invalid: { label: 'Inválido', kind: 'error' },
  applied: { label: 'Aplicado', kind: 'attention' },
  committed: { label: 'Commitado', kind: 'ready' },
  unknown: { label: 'Sem registro', kind: 'blocked' }
};

interface AppState {
  activeStage: StageKey;
  selectedEnvironmentId?: string;
  showEnvironmentForm: boolean;
  miniPr: MiniPrDraft;
  importedPackage?: ImportPackageResult;
  lastExportedPackagePath?: string;
  applySource: ApplySourceRequest;
  lastApplyResult?: ExecuteApplyResult;
  suggestedCommitTitle?: string;
  showAdvanced: boolean;
}

const state: AppState = {
  activeStage: 'environment',
  showEnvironmentForm: false,
  miniPr: { title: '', context: '', whatChanged: '', notes: '' },
  applySource: { kind: 'workspace' },
  showAdvanced: readShowAdvanced()
};

function readShowAdvanced(): boolean {
  try {
    return window.localStorage.getItem(ADVANCED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeShowAdvanced(value: boolean): void {
  try {
    window.localStorage.setItem(ADVANCED_STORAGE_KEY, String(value));
  } catch {
    // Preferência apenas de conveniência.
  }
}

function api(): SvnflowDesktopApi {
  if (!window.svnflowDesktop) {
    throw new Error('Integração com o processo principal indisponível no preload.');
  }

  return window.svnflowDesktop;
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

function stageBody(): HTMLElement {
  const body = query<HTMLElement>('[data-role="stage-body"]');

  if (!body) {
    throw new Error('Área principal não encontrada.');
  }

  return body;
}

function setStatusMessage(message: string): void {
  const status = query<HTMLElement>('[data-role="app-status"]');

  if (status) {
    status.textContent = message;
  }
}

function updateContext(values: { status?: string; git?: string; svn?: string; base?: string; guard?: string }): void {
  const fields: Array<[string, string | undefined]> = [
    ['environment-status', values.status],
    ['environment-git', values.git],
    ['environment-svn', values.svn],
    ['environment-base', values.base],
    ['advance-guard', values.guard]
  ];

  for (const [role, value] of fields) {
    const element = query<HTMLElement>(`[data-role="${role}"]`);

    if (element && value !== undefined) {
      element.textContent = value;
      element.title = value;
    }
  }
}

function badge(kind: EnvironmentVisualStatus, label: string): string {
  return `<span class="status-badge" data-kind="${kind}">${escapeHtml(label)}</span>`;
}

function renderMessages(title: string, items: Array<ScreenBlocker | ScreenAlert>, tone: 'blocked' | 'attention'): string {
  if (items.length === 0) {
    return '';
  }

  const rows = items.map((item) => `<li>${escapeHtml(item.message)}</li>`).join('');
  return `<div class="notice" data-tone="${tone}"><p class="card-label">${escapeHtml(title)}</p><ul class="preview-list">${rows}</ul></div>`;
}

function renderFileRows(files: ScreenWorkspaceFile[]): string {
  return files
    .map((file) => `
      <li class="preview-row">
        ${badge(file.rawStatus.startsWith('D') ? 'error' : file.rawStatus.startsWith('A') ? 'ready' : 'attention', file.status)}
        <span title="${escapeHtml(file.description)}">${escapeHtml(file.path)}</span>
      </li>
    `)
    .join('');
}

function relativeToCheckout(checkoutPath: string | undefined, filePath: string): string {
  if (!checkoutPath) {
    return filePath;
  }

  const root = checkoutPath.replace(/[\\/]+$/, '');
  return filePath.startsWith(`${root}/`) || filePath.startsWith(`${root}\\`)
    ? filePath.slice(root.length + 1)
    : filePath;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

async function goToStage(key: StageKey): Promise<void> {
  state.activeStage = key;
  renderNavigation();
  await renderActiveStage();
}

function bindClick(root: ParentNode, selector: string, handler: (button: HTMLButtonElement) => void | Promise<void>): void {
  root.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
    button.addEventListener('click', () => {
      void handler(button);
    });
  });
}

// ---------------------------------------------------------------------------
// Ambiente

function renderEnvironmentForm(): string {
  return `
    <form class="form-grid" data-role="environment-form">
      <p class="card-label">Cadastrar ambiente</p>
      <label class="field">
        <span>Nome amigável (opcional)</span>
        <input class="form-input" name="name" type="text" placeholder="Usa o nome da pasta Git quando vazio" />
      </label>
      <label class="field">
        <span>Workspace Git</span>
        <span class="inline-row">
          <input class="form-input" name="gitWorkspacePath" type="text" placeholder="Pasta do repositório Git local" required />
          <button class="action-button secondary" type="button" data-role="pick-git">Escolher pasta</button>
        </span>
      </label>
      <label class="field">
        <span>Checkout SVN</span>
        <span class="inline-row">
          <input class="form-input" name="svnCheckoutPath" type="text" placeholder="Pasta do checkout SVN de destino" required />
          <button class="action-button secondary" type="button" data-role="pick-svn">Escolher pasta</button>
        </span>
      </label>
      <label class="field">
        <span>Base de comparação Git (usada só no modo avançado)</span>
        <input class="form-input" name="baseBranch" type="text" value="main" />
      </label>
      <p class="feedback" data-role="environment-form-feedback"></p>
      <div class="stage-actions">
        <button class="action-button" type="submit">Validar e salvar ambiente</button>
        ${state.showEnvironmentForm ? '<button class="action-button secondary" type="button" data-role="cancel-form">Cancelar</button>' : ''}
      </div>
    </form>
  `;
}

function bindEnvironmentForm(root: HTMLElement): void {
  const form = query<HTMLFormElement>('[data-role="environment-form"]', root);

  if (!form) {
    return;
  }

  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const feedback = query<HTMLElement>('[data-role="environment-form-feedback"]', form);

  bindClick(form, '[data-role="pick-git"]', async () => {
    const selected = await api().selectDirectory('Selecionar workspace Git', input('gitWorkspacePath').value || undefined);
    if (selected) {
      input('gitWorkspacePath').value = selected;
    }
  });

  bindClick(form, '[data-role="pick-svn"]', async () => {
    const selected = await api().selectDirectory('Selecionar checkout SVN', input('svnCheckoutPath').value || undefined);
    if (selected) {
      input('svnCheckoutPath').value = selected;
    }
  });

  bindClick(form, '[data-role="cancel-form"]', async () => {
    state.showEnvironmentForm = false;
    await renderActiveStage();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const submit = query<HTMLButtonElement>('button[type="submit"]', form);
      if (submit) {
        submit.disabled = true;
      }
      setStatusMessage('Validando Git, SVN e base de comparação...');

      const response = await api().registerEnvironment({
        name: input('name').value,
        gitWorkspacePath: input('gitWorkspacePath').value,
        svnCheckoutPath: input('svnCheckoutPath').value,
        baseBranch: input('baseBranch').value
      });

      if (!response.registration.canSave) {
        if (feedback) {
          const details = response.registration.blockers.map((blocker) => blocker.message).join(' ');
          feedback.textContent = `${response.registration.message} ${details}`.trim();
          feedback.className = 'feedback invalid';
        }
        setStatusMessage(response.registration.message);
        if (submit) {
          submit.disabled = false;
        }
        return;
      }

      state.showEnvironmentForm = false;
      state.selectedEnvironmentId = response.registration.savedEnvironment?.id;
      renderEnvironmentStage(response.screen);
    })();
  });
}

function renderEnvironmentStage(screen: EnvironmentScreenState): void {
  const body = stageBody();
  state.selectedEnvironmentId = screen.selectedEnvironmentId;
  setStatusMessage(screen.message);

  if (screen.emptyState || screen.items.length === 0) {
    updateContext({
      status: 'Pendente',
      git: 'Nenhum ambiente cadastrado',
      svn: 'Nenhum ambiente cadastrado',
      base: '-',
      guard: 'Operações sensíveis bloqueadas'
    });
    body.innerHTML = `
      <p class="empty-state">Nenhum ambiente salvo. Informe o workspace Git e o checkout SVN que recebem a alteração.</p>
      ${renderEnvironmentForm()}
    `;
    bindEnvironmentForm(body);
    return;
  }

  const selected = screen.selected;
  updateContext({
    status: STATUS_LABELS[selected?.visualStatus ?? 'pending'],
    git: selected?.gitWorkspacePath ?? 'Não informado',
    svn: selected?.svnCheckoutPath ?? 'Não informado',
    base: selected?.baseBranch ?? '-',
    guard: screen.canAdvanceToSensitiveOperations
      ? 'Ambiente validado para avanço controlado'
      : 'Valide o ambiente antes de aplicar ou commitar'
  });

  const items = screen.items.map((item) => `
    <li>
      <button class="environment-item" data-role="environment-item" data-environment-id="${escapeHtml(item.id)}" data-selected="${item.id === screen.selectedEnvironmentId}">
        <span>
          <span class="environment-name">${escapeHtml(item.name)}</span>
          <span class="environment-meta">${item.needsRevalidation ? 'Revalidação necessária' : 'Validação atualizada'}</span>
        </span>
        ${badge(item.visualStatus, STATUS_LABELS[item.visualStatus])}
      </button>
    </li>
  `).join('');

  const details = selected
    ? `
      <div class="commit-context">
        <p class="card-label">Ambiente selecionado</p>
        <p class="context-line">Workspace Git: <strong>${escapeHtml(selected.gitWorkspacePath)}</strong></p>
        <p class="context-line">Checkout SVN: <strong>${escapeHtml(selected.svnCheckoutPath)}</strong></p>
        <p class="context-line">Base de comparação: <strong>${escapeHtml(selected.baseBranch)}</strong></p>
      </div>
    `
    : '';

  body.innerHTML = `
    <ul class="environment-list">${items}</ul>
    ${details}
    <div class="stage-actions">
      <button class="action-button" data-role="revalidate-action" ${screen.selectedEnvironmentId ? '' : 'disabled'}>Validar ou revalidar ambiente</button>
      <button class="action-button secondary" data-role="next-stage">Voltar para a sincronização</button>
      <button class="action-button secondary" data-role="new-environment">Cadastrar outro ambiente</button>
      <button class="action-button danger" data-role="remove-environment" ${screen.selectedEnvironmentId ? '' : 'disabled'}>Remover da lista</button>
    </div>
    ${state.showEnvironmentForm ? renderEnvironmentForm() : ''}
  `;

  bindClick(body, '[data-role="environment-item"]', async (button) => {
    setStatusMessage('Carregando ambiente selecionado...');
    renderEnvironmentStage(await api().getEnvironmentScreenState(button.dataset.environmentId));
  });

  bindClick(body, '[data-role="revalidate-action"]', async (button) => {
    button.disabled = true;
    setStatusMessage('Executando validação do ambiente...');
    renderEnvironmentStage(await api().revalidateEnvironment(state.selectedEnvironmentId));
  });

  bindClick(body, '[data-role="next-stage"]', () => showDesktopView());

  bindClick(body, '[data-role="new-environment"]', async () => {
    state.showEnvironmentForm = true;
    renderEnvironmentStage(screen);
  });

  bindClick(body, '[data-role="remove-environment"]', async () => {
    if (!state.selectedEnvironmentId || !selected) {
      return;
    }

    if (!window.confirm(`Remover "${selected.name}" da lista? As pastas locais não serão apagadas.`)) {
      return;
    }

    renderEnvironmentStage(await api().removeEnvironment(state.selectedEnvironmentId));
  });

  bindEnvironmentForm(body);
}

// ---------------------------------------------------------------------------
// Workspace Git e Preview

function renderWorkspaceStage(workspaceState: WorkspaceScreenState): void {
  const body = stageBody();
  setStatusMessage(workspaceState.message);
  updateContext({
    status: workspaceState.status === 'ready' ? 'Pronto' : 'Bloqueado',
    git: workspaceState.environment?.gitWorkspacePath ?? 'Não disponível',
    svn: workspaceState.environment?.svnCheckoutPath ?? 'Não disponível',
    base: workspaceState.workspace?.baseBranch ?? '-',
    guard: workspaceState.canAdvanceToPreview
      ? 'Workspace Git pronto para o preview'
      : 'Revise bloqueios ou ausência de alterações'
  });

  if (!workspaceState.workspace) {
    body.innerHTML = `
      <p class="empty-state">Nenhum workspace Git disponível para inspeção. Cadastre ou valide um ambiente.</p>
      ${renderMessages('Bloqueios', workspaceState.blockers, 'blocked')}
    `;
    return;
  }

  const { workspace } = workspaceState;
  body.innerHTML = `
    <div class="preview-summary">
      <p class="context-line">Branch atual: <strong>${escapeHtml(workspace.branch ?? 'não identificada')}</strong></p>
      <p class="context-line">Base de comparação: <strong>${escapeHtml(workspace.baseBranch)}</strong></p>
      <p class="context-line">Situação: <strong>${workspaceState.hasChanges ? 'Com alterações commitadas em relação à base' : 'Sem alterações em relação à base'}</strong></p>
      <p class="context-line">Resumo: <strong>${workspace.totals.added}</strong> criados, <strong>${workspace.totals.modified}</strong> modificados, <strong>${workspace.totals.deleted}</strong> removidos</p>
    </div>
    ${workspace.files.length > 0 ? `<ul class="preview-files">${renderFileRows(workspace.files)}</ul>` : '<p class="empty-state">Nenhum arquivo alterado foi detectado.</p>'}
    ${renderMessages('Bloqueios', workspaceState.blockers, 'blocked')}
    ${renderMessages('Alertas', workspaceState.alerts, 'attention')}
    <div class="stage-actions">
      <button class="action-button" data-role="next-stage" ${workspaceState.canAdvanceToPreview ? '' : 'disabled'}>Seguir para Preview</button>
    </div>
  `;

  bindClick(body, '[data-role="next-stage"]', () => goToStage('preview'));
}

function previewStateLabel(preview: PreviewScreenState): { kind: EnvironmentVisualStatus; label: string } {
  if (!preview.workspace || preview.workspace.files.length === 0) {
    return { kind: 'blocked', label: 'Preview vazio' };
  }

  if (preview.status !== 'ready') {
    return { kind: 'error', label: 'Preview bloqueado' };
  }

  return { kind: 'ready', label: 'Pronto para seguir' };
}

function renderPreviewStage(preview: PreviewScreenState): void {
  const body = stageBody();
  const label = previewStateLabel(preview);
  setStatusMessage(preview.message);
  updateContext({
    status: label.label,
    git: preview.environment?.gitWorkspacePath ?? 'Não disponível',
    svn: preview.environment?.svnCheckoutPath ?? 'Não disponível',
    base: preview.workspace?.baseBranch ?? '-',
    guard: preview.canApplyInSvn ? 'Preview válido: aplicar ou empacotar' : 'Continuidade bloqueada até preview válido'
  });

  const workspace = preview.workspace;
  const summary = workspace
    ? `
      <div class="preview-summary">
        <p class="context-line">Revisando o workspace Git de <strong>${escapeHtml(preview.environment?.environmentName ?? '-')}</strong> ${badge(label.kind, label.label)}</p>
        <p class="context-line">Branch de origem: <strong>${escapeHtml(workspace.branch ?? 'não identificada')}</strong></p>
        <p class="context-line">Base de comparação: <strong>${escapeHtml(workspace.baseBranch)}</strong></p>
        <p class="context-line">Diferença detectada: <strong>${workspace.totalAffectedFiles}</strong> arquivo(s) — ${workspace.totals.added} criado(s), ${workspace.totals.modified} modificado(s), ${workspace.totals.deleted} removido(s)${workspace.totals.renamed ? `, ${workspace.totals.renamed} renomeado(s)` : ''}</p>
      </div>
    `
    : '';

  body.innerHTML = `
    ${summary}
    ${workspace && workspace.files.length > 0 ? `<ul class="preview-files">${renderFileRows(workspace.files)}</ul>` : '<p class="empty-state">Nenhum arquivo afetado disponível para preview.</p>'}
    ${renderMessages('Bloqueios', preview.blockers, 'blocked')}
    ${renderMessages('Alertas', preview.alerts, 'attention')}
    <p class="hint">O preview é somente leitura: não altera o checkout SVN e não gera pacote.</p>
    <div class="stage-actions">
      <button class="action-button" data-role="go-apply" ${preview.canApplyInSvn ? '' : 'disabled'}>Aplicar no checkout SVN</button>
      <button class="action-button secondary" data-role="go-packages" ${preview.canExportPackage ? '' : 'disabled'}>Criar pacote .svnflow</button>
    </div>
  `;

  bindClick(body, '[data-role="go-apply"]', async () => {
    state.applySource = { kind: 'workspace' };
    await goToStage('apply');
  });
  bindClick(body, '[data-role="go-packages"]', () => goToStage('packages'));
}

// ---------------------------------------------------------------------------
// Pacotes

function renderMiniPrForm(screen: PackagesScreenState): string {
  const preview = screen.preview;

  if (!preview.canExportPackage || !preview.workspace) {
    const reason = preview.blockers[0]?.message ?? preview.message;
    return `
      <section class="section">
        <p class="card-label">Criar pacote a partir do workspace atual</p>
        <p class="empty-state">Exportação indisponível: ${escapeHtml(reason)}</p>
        <div class="stage-actions"><button class="action-button secondary" data-role="go-preview">Revisar Preview</button></div>
      </section>
    `;
  }

  const workspace = preview.workspace;

  return `
    <section class="section">
      <p class="card-label">Criar pacote a partir do workspace atual</p>
      <div class="commit-context">
        <p class="context-line">Dados técnicos do preview: <strong>${escapeHtml(workspace.branch ?? '-')}</strong> comparada com <strong>${escapeHtml(workspace.baseBranch)}</strong>, <strong>${workspace.totalAffectedFiles}</strong> arquivo(s), autor <strong>${escapeHtml(screen.author ?? 'não detectado')}</strong></p>
        <details>
          <summary>Arquivos que entrarão no pacote</summary>
          <ul class="preview-files">${renderFileRows(workspace.files)}</ul>
        </details>
      </div>
      <form class="form-grid" data-role="mini-pr-form">
        <p class="card-label">Mini PR (campos humanos do pr.md)</p>
        <label class="field"><span>Título *</span><input class="form-input" name="title" type="text" maxlength="120" value="${escapeHtml(state.miniPr.title)}" /></label>
        <label class="field"><span>Contexto *</span><textarea class="form-input" name="context" rows="3">${escapeHtml(state.miniPr.context)}</textarea></label>
        <label class="field"><span>O que mudou * (um item por linha)</span><textarea class="form-input" name="whatChanged" rows="4">${escapeHtml(state.miniPr.whatChanged)}</textarea></label>
        <label class="field"><span>Observações</span><textarea class="form-input" name="notes" rows="2">${escapeHtml(state.miniPr.notes)}</textarea></label>
        <p class="feedback" data-role="mini-pr-feedback"></p>
        <details open>
          <summary>Prévia do pr.md</summary>
          <pre class="review-markdown" data-role="pr-md-preview">Carregando prévia...</pre>
        </details>
        <p class="hint">Exportar gera um arquivo em ${escapeHtml(screen.packagesDirectory)}. Não altera o checkout SVN nem publica nada.</p>
        <div class="stage-actions">
          <button class="action-button" type="submit" data-role="export-package">Exportar pacote .svnflow</button>
        </div>
        <div data-role="export-result"></div>
      </form>
    </section>
  `;
}

function readMiniPrForm(form: HTMLFormElement): MiniPrDraft {
  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement).value;
  return {
    title: value('title'),
    context: value('context'),
    whatChanged: value('whatChanged'),
    notes: value('notes')
  };
}

function missingMiniPrFields(draft: MiniPrDraft): string[] {
  const missing: string[] = [];
  if (!draft.title.trim()) missing.push('título');
  if (!draft.context.trim()) missing.push('contexto');
  if (!draft.whatChanged.trim()) missing.push('o que mudou');
  return missing;
}

function bindMiniPrForm(root: HTMLElement): void {
  const form = query<HTMLFormElement>('[data-role="mini-pr-form"]', root);

  if (!form) {
    return;
  }

  const feedback = query<HTMLElement>('[data-role="mini-pr-feedback"]', form);
  const markdownPreview = query<HTMLElement>('[data-role="pr-md-preview"]', form);
  const exportButton = query<HTMLButtonElement>('[data-role="export-package"]', form);
  const exportResult = query<HTMLElement>('[data-role="export-result"]', form);
  let timer: number | undefined;

  const refresh = () => {
    state.miniPr = readMiniPrForm(form);
    const missing = missingMiniPrFields(state.miniPr);

    if (feedback) {
      feedback.textContent = missing.length > 0 ? `Obrigatório para exportar: ${missing.join(', ')}.` : 'Mini PR completa.';
      feedback.className = missing.length > 0 ? 'feedback invalid' : 'feedback valid';
    }

    if (exportButton) {
      exportButton.disabled = missing.length > 0;
    }

    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      if (markdownPreview) {
        markdownPreview.textContent = await api().previewMiniPrMarkdown({
          environmentId: state.selectedEnvironmentId,
          miniPr: state.miniPr
        });
      }
    }, 350);
  };

  form.addEventListener('input', refresh);
  refresh();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      if (exportButton) {
        exportButton.disabled = true;
      }
      setStatusMessage('Gerando patch e exportando pacote .svnflow...');

      const result = await api().exportPackage({ environmentId: state.selectedEnvironmentId, miniPr: readMiniPrForm(form) });

      if (!exportResult) {
        return;
      }

      if (!result.ok || !result.packagePath) {
        exportResult.innerHTML = `<div class="notice" data-tone="blocked"><p>${escapeHtml(result.message)}</p></div>`;
        setStatusMessage(`Falha ao exportar pacote: ${result.message}`);
        if (exportButton) {
          exportButton.disabled = false;
        }
        return;
      }

      state.lastExportedPackagePath = result.packagePath;
      state.suggestedCommitTitle = state.miniPr.title;
      exportResult.innerHTML = `
        <div class="notice" data-tone="ready">
          <p class="card-label">Pacote exportado</p>
          <p class="context-line">Arquivo: <strong>${escapeHtml(result.packagePath)}</strong></p>
          <p class="context-line">Checksum: <strong>${escapeHtml(result.manifest?.checksum.slice(0, 16))}…</strong></p>
          <p class="hint">Próximo passo: compartilhe o arquivo por um canal permitido ou aplique a alteração no seu checkout SVN.</p>
          <div class="stage-actions">
            <button class="action-button" type="button" data-role="apply-exported">Aplicar este pacote no SVN</button>
            <button class="action-button secondary" type="button" data-role="refresh-packages">Atualizar lista de pacotes</button>
          </div>
        </div>
      `;
      setStatusMessage('Pacote .svnflow exportado com sucesso.');

      bindClick(exportResult, '[data-role="apply-exported"]', async () => {
        state.applySource = { kind: 'package', packagePath: result.packagePath! };
        state.importedPackage = await api().importAndValidatePackage(result.packagePath!);
        await goToStage('apply');
      });
      bindClick(exportResult, '[data-role="refresh-packages"]', () => renderActiveStage());
    })();
  });
}

function renderLibrary(screen: PackagesScreenState): string {
  const library = screen.library;
  const rows = library.items.map((item) => {
    const known = HISTORY_KIND_LABELS[item.knownStatus] ?? HISTORY_KIND_LABELS.unknown;
    return `
      <li class="package-row">
        <span class="package-info">
          <span class="environment-name">${escapeHtml(item.title ?? item.fileName)}</span>
          <span class="environment-meta">${escapeHtml(item.fileName)} · ${escapeHtml(formatDate(item.generatedAt ?? item.modifiedAt))}${item.readable ? '' : ' · arquivo ilegível'}</span>
        </span>
        ${badge(known.kind, known.label)}
        <button class="action-button secondary" data-role="open-package" data-package-path="${escapeHtml(item.packagePath)}">Abrir e validar</button>
      </li>
    `;
  }).join('');

  const missing = library.missingReferences.map((reference) => `
    <li>${escapeHtml(reference.packagePath)} (${escapeHtml(HISTORY_KIND_LABELS[reference.lastKind]?.label ?? reference.lastKind)} em ${escapeHtml(formatDate(reference.recordedAt))})</li>
  `).join('');

  return `
    <section class="section">
      <p class="card-label">Pacotes locais</p>
      <div class="inline-row">
        <p class="context-line">Pasta: <strong>${escapeHtml(screen.packagesDirectory)}</strong></p>
        <button class="action-button secondary" data-role="change-directory">Alterar pasta</button>
        <button class="action-button secondary" data-role="refresh-packages">Atualizar</button>
      </div>
      ${library.ok ? '' : `<p class="empty-state">${escapeHtml(library.message)}</p>`}
      ${rows ? `<ul class="preview-files">${rows}</ul>` : `<p class="empty-state">${library.ok ? 'Nenhum pacote .svnflow nesta pasta ainda.' : ''}</p>`}
      ${missing ? `<div class="notice" data-tone="attention"><p class="card-label">Pacotes do histórico removidos ou movidos</p><ul class="preview-list">${missing}</ul></div>` : ''}
      <div class="stage-actions">
        <button class="action-button secondary" data-role="pick-package">Selecionar arquivo .svnflow manualmente</button>
      </div>
      <details>
        <summary>Informar caminho do arquivo</summary>
        <div class="inline-row">
          <input id="package-path" class="form-input" type="text" placeholder="Caminho completo do arquivo .svnflow" />
          <button class="action-button secondary" data-role="open-typed-package">Abrir</button>
        </div>
      </details>
      <div data-role="package-review">${state.importedPackage ? renderPackageReview(state.importedPackage) : ''}</div>
    </section>
  `;
}

function renderPackageReview(result: ImportPackageResult): string {
  if (!result.ok) {
    const errors = result.errors
      .map((error) => `<li>[${escapeHtml(error.category)}] ${escapeHtml(error.message)}</li>`)
      .join('');

    return `
      <div class="notice" data-tone="blocked">
        <p class="card-label">Pacote inválido</p>
        <p class="context-line">${escapeHtml(result.packagePath)}</p>
        <p class="context-line">${escapeHtml(result.message)}</p>
        <ul class="preview-list">${errors}</ul>
      </div>
    `;
  }

  const review = result.review;
  const whatChanged = (review?.whatChanged ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const files = (review?.files ?? []).map((file) => `<li class="preview-row">${badge('attention', file.status)}<span>${escapeHtml(file.path)}</span></li>`).join('');

  return `
    <div class="notice" data-tone="ready">
      <p class="card-label">Revisão do pacote (leitura — nada foi aplicado)</p>
      <h3 class="review-title">${escapeHtml(review?.title)}</h3>
      <p class="context-line">Autor: <strong>${escapeHtml(review?.author)}</strong> · Gerado em <strong>${escapeHtml(formatDate(review?.generatedAt))}</strong></p>
      <p class="context-line">Origem: <strong>${escapeHtml(review?.branch)}</strong> comparada com <strong>${escapeHtml(review?.baseBranch)}</strong> no ambiente <strong>${escapeHtml(review?.environmentName)}</strong></p>
      <p class="context-line">Formato ${escapeHtml(result.manifest?.formatVersion)} · checksum conferido</p>
      <p class="card-label">Contexto</p>
      <p class="review-text">${escapeHtml(review?.context)}</p>
      <p class="card-label">O que mudou</p>
      <ul class="preview-list bullet">${whatChanged}</ul>
      <p class="card-label">Arquivos afetados</p>
      <ul class="preview-files">${files}</ul>
      <p class="card-label">Observações</p>
      <p class="review-text">${escapeHtml(review?.notes)}</p>
      ${review && review.missingOptionalFields.length > 0 ? `<p class="hint">Campos não informados no pacote: ${escapeHtml(review.missingOptionalFields.join(', '))}.</p>` : ''}
      <details>
        <summary>pr.md original</summary>
        <pre class="review-markdown">${escapeHtml(review?.markdown)}</pre>
      </details>
      <div class="stage-actions">
        <button class="action-button" data-role="apply-imported" ${result.canApply ? '' : 'disabled'}>Seguir para aplicação no SVN</button>
      </div>
      ${result.canApply ? '' : `<p class="hint">${escapeHtml(result.applyBlockReason)}</p>`}
    </div>
  `;
}

async function openPackage(packagePath: string): Promise<void> {
  if (!packagePath.trim()) {
    setStatusMessage('Informe ou selecione um arquivo .svnflow.');
    return;
  }

  setStatusMessage('Importando e validando pacote .svnflow...');
  state.importedPackage = await api().importAndValidatePackage(packagePath);
  setStatusMessage(state.importedPackage.ok ? 'Pacote validado. Revise antes de aplicar.' : 'Pacote inválido.');

  const container = query<HTMLElement>('[data-role="package-review"]');

  if (container) {
    container.innerHTML = renderPackageReview(state.importedPackage);
    bindPackageReview(container);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function bindPackageReview(root: HTMLElement): void {
  bindClick(root, '[data-role="apply-imported"]', async () => {
    if (!state.importedPackage?.canApply) {
      return;
    }

    state.applySource = { kind: 'package', packagePath: state.importedPackage.packagePath };
    state.suggestedCommitTitle = state.importedPackage.review?.title;
    await goToStage('apply');
  });
}

function renderPackagesStage(screen: PackagesScreenState): void {
  const body = stageBody();
  setStatusMessage(screen.library.message);
  updateContext({
    status: screen.preview.canExportPackage ? 'Preview válido' : 'Preview indisponível',
    git: screen.preview.environment?.gitWorkspacePath ?? 'Não disponível',
    svn: screen.preview.environment?.svnCheckoutPath ?? 'Não disponível',
    base: screen.preview.workspace?.baseBranch ?? '-',
    guard: 'Pacotes não alteram o checkout SVN'
  });

  body.innerHTML = `
    ${renderMiniPrForm(screen)}
    ${renderLibrary(screen)}
  `;

  bindMiniPrForm(body);
  bindPackageReview(body);
  bindClick(body, '[data-role="go-preview"]', () => goToStage('preview'));
  bindClick(body, '[data-role="refresh-packages"]', () => renderActiveStage());
  bindClick(body, '[data-role="open-package"]', (button) => openPackage(button.dataset.packagePath ?? ''));
  bindClick(body, '[data-role="open-typed-package"]', () => openPackage(query<HTMLInputElement>('#package-path', body)?.value ?? ''));
  bindClick(body, '[data-role="pick-package"]', async () => {
    const selected = await api().selectPackageFile(screen.packagesDirectory);
    if (selected) {
      await openPackage(selected);
    }
  });
  bindClick(body, '[data-role="change-directory"]', async () => {
    const selected = await api().selectDirectory('Selecionar pasta de pacotes .svnflow', screen.packagesDirectory);
    if (selected) {
      await api().setPackagesDirectory(selected);
      await renderActiveStage();
    }
  });
}

// ---------------------------------------------------------------------------
// Aplicação SVN

function renderPlanFiles(plan: ApplyPlan): string {
  const group = (label: string, kind: EnvironmentVisualStatus, files: string[]) => files
    .map((file) => `<li class="preview-row">${badge(kind, label)}<span>${escapeHtml(file)}</span></li>`)
    .join('');

  return `<ul class="preview-files">
    ${group('Criar', 'ready', plan.files.added)}
    ${group('Modificar', 'attention', plan.files.modified)}
    ${group('Remover', 'error', plan.files.deleted)}
  </ul>`;
}

function renderApplyResult(result: ExecuteApplyResult): string {
  const status = result.postApply?.checkoutState;
  const checkoutPath = result.plan.environment.svnCheckoutPath;
  const statusRows = (status?.files ?? [])
    .map((file) => `<li class="preview-row">${badge(file.status === 'conflicted' ? 'error' : 'attention', file.rawCode)}<span title="${escapeHtml(file.description)}">${escapeHtml(relativeToCheckout(checkoutPath, file.path))}</span></li>`)
    .join('');
  const tone = result.status === 'applied' ? 'ready' : 'blocked';

  return `
    <div class="notice" data-tone="${tone}">
      <p class="card-label">${result.status === 'applied' ? 'Alteração aplicada no checkout SVN' : 'Aplicação não concluída'}</p>
      <p class="context-line">${escapeHtml(result.message)}</p>
      ${result.scheduling && result.scheduling.added.length > 0 ? `<p class="context-line">Agendados com svn add: <strong>${result.scheduling.added.length}</strong></p>` : ''}
      ${result.scheduling && result.scheduling.deleted.length > 0 ? `<p class="context-line">Agendados com svn delete: <strong>${result.scheduling.deleted.length}</strong></p>` : ''}
      ${statusRows ? `<p class="card-label">svn status</p><ul class="preview-files">${statusRows}</ul>` : ''}
      <div class="stage-actions">
        <button class="action-button" data-role="go-commit" ${result.postApply?.canAdvance ? '' : 'disabled'}>Seguir para Commit SVN</button>
      </div>
    </div>
  `;
}

async function renderApplyStage(): Promise<void> {
  const body = stageBody();
  const packageAvailable = Boolean(state.importedPackage?.ok && state.importedPackage.canApply);

  if (state.applySource.kind === 'package' && !packageAvailable) {
    state.applySource = { kind: 'workspace' };
  }

  const sourceSelector = `
    <fieldset class="source-selector">
      <legend class="card-label">Origem da alteração</legend>
      <label><input type="radio" name="apply-source" value="workspace" ${state.applySource.kind === 'workspace' ? 'checked' : ''} /> Workspace Git atual (preview)</label>
      <label><input type="radio" name="apply-source" value="package" ${state.applySource.kind === 'package' ? 'checked' : ''} ${packageAvailable ? '' : 'disabled'} /> Pacote importado${packageAvailable ? `: ${escapeHtml(state.importedPackage?.review?.title)}` : ' (abra um pacote na etapa Pacotes)'}</label>
    </fieldset>
  `;

  body.innerHTML = `${sourceSelector}<div data-role="apply-plan"><p class="empty-state">Pré-validando aplicação...</p></div>`;

  body.querySelectorAll<HTMLInputElement>('input[name="apply-source"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      state.applySource = radio.value === 'package' && state.importedPackage
        ? { kind: 'package', packagePath: state.importedPackage.packagePath }
        : { kind: 'workspace' };
      state.lastApplyResult = undefined;
      void renderApplyStage();
    });
  });

  const planContainer = query<HTMLElement>('[data-role="apply-plan"]', body)!;

  if (state.lastApplyResult) {
    planContainer.innerHTML = renderApplyResult(state.lastApplyResult);
    bindClick(planContainer, '[data-role="go-commit"]', () => goToStage('commit'));
    return;
  }

  setStatusMessage('Pré-validando patch no checkout SVN...');
  const response = await api().getApplyPlan(state.selectedEnvironmentId, state.applySource);
  const plan = response.plan;
  setStatusMessage(response.message);
  updateContext({
    status: plan?.canConfirm ? 'Pronto para aplicar' : 'Bloqueado',
    svn: plan?.environment.svnCheckoutPath,
    guard: plan?.canConfirm ? 'Aplicação exige confirmação explícita' : 'Aplicação bloqueada'
  });

  if (!plan) {
    planContainer.innerHTML = `<div class="notice" data-tone="blocked"><p>${escapeHtml(response.message)}</p></div>`;
    return;
  }

  planContainer.innerHTML = `
    <div class="preview-summary">
      <p class="context-line">Origem: <strong>${escapeHtml(plan.source.label)}</strong></p>
      <p class="context-line">Checkout SVN de destino: <strong>${escapeHtml(plan.environment.svnCheckoutPath)}</strong></p>
      <p class="context-line">Arquivos: <strong>${plan.files.added.length}</strong> a criar, <strong>${plan.files.modified.length}</strong> a modificar, <strong>${plan.files.deleted.length}</strong> a remover</p>
    </div>
    ${renderPlanFiles(plan)}
    ${renderMessages('Bloqueios', plan.blockers, 'blocked')}
    ${plan.warnings.length > 0 ? `<div class="notice" data-tone="attention"><p class="card-label">Atenção</p><ul class="preview-list">${plan.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>` : ''}
    <label class="checkbox-row">
      <input type="checkbox" data-role="confirm-apply" ${plan.canConfirm ? '' : 'disabled'} />
      Revisei os arquivos e quero alterar o checkout SVN local. Entendo que isto não publica commit.
    </label>
    <div class="stage-actions">
      <button class="action-button" data-role="execute-apply" disabled>Aplicar no checkout SVN</button>
      <button class="action-button secondary" data-role="revalidate-plan">Pré-validar novamente</button>
    </div>
  `;

  const confirmBox = query<HTMLInputElement>('[data-role="confirm-apply"]', planContainer);
  const executeButton = query<HTMLButtonElement>('[data-role="execute-apply"]', planContainer);

  confirmBox?.addEventListener('change', () => {
    if (executeButton) {
      executeButton.disabled = !(confirmBox.checked && plan.canConfirm);
    }
  });

  bindClick(planContainer, '[data-role="revalidate-plan"]', () => renderApplyStage());
  bindClick(planContainer, '[data-role="execute-apply"]', async (button) => {
    button.disabled = true;
    setStatusMessage('Aplicando patch no checkout SVN...');
    const executed = await api().executeApply(state.selectedEnvironmentId, state.applySource);

    if (!executed.result) {
      planContainer.insertAdjacentHTML('beforeend', `<div class="notice" data-tone="blocked"><p>${escapeHtml(executed.message)}</p></div>`);
      setStatusMessage(executed.message);
      return;
    }

    state.lastApplyResult = executed.result;
    setStatusMessage(executed.message);
    planContainer.innerHTML = renderApplyResult(executed.result);
    bindClick(planContainer, '[data-role="go-commit"]', () => goToStage('commit'));
  });
}

// ---------------------------------------------------------------------------
// Commit SVN

function validateTitle(title: string): string | undefined {
  if (title.length < 10) return 'Título deve ter no mínimo 10 caracteres.';
  if (title.length > 72) return 'Título deve ter no máximo 72 caracteres.';
  if (!/^[A-ZÀ-Ý]/.test(title)) return 'Título deve começar com letra maiúscula.';
  return undefined;
}

function validateDescription(description: string): string | undefined {
  if (description.length > 0 && description.length < 20) return 'Descrição opcional: mínimo de 20 caracteres quando preenchida.';
  return undefined;
}

function renderCommitStage(commit: CommitScreenState): void {
  const body = stageBody();
  setStatusMessage(commit.message);
  updateContext({
    status: commit.canExecuteCommit ? 'Pronto para commit' : 'Bloqueado',
    svn: commit.environment?.svnCheckoutPath,
    guard: commit.canExecuteCommit ? 'Commit exige confirmação explícita' : 'Commit bloqueado por validações pendentes'
  });

  const blockers = commit.commitValidation?.blockers ?? [];
  const files = commit.checkoutFiles
    .map((file) => `<li class="preview-row">${badge(file.status === 'C' ? 'error' : file.status === '?' ? 'blocked' : 'attention', file.status)}<span title="${escapeHtml(file.description)}">${escapeHtml(file.path)}</span></li>`)
    .join('');

  if (!commit.canExecuteCommit) {
    body.innerHTML = `
      <p class="empty-state">${escapeHtml(commit.message)}</p>
      ${files ? `<p class="card-label">svn status</p><ul class="preview-files">${files}</ul>` : ''}
      ${renderMessages('Bloqueios', blockers, 'blocked')}
      <div class="stage-actions"><button class="action-button secondary" data-role="refresh">Validar novamente</button></div>
    `;
    bindClick(body, '[data-role="refresh"]', () => renderActiveStage());
    return;
  }

  const suggestedTitle = state.suggestedCommitTitle ?? '';

  body.innerHTML = `
    <div class="commit-form">
      <p class="context-line">Checkout: <strong>${escapeHtml(commit.environment?.svnCheckoutPath)}</strong> · <strong>${commit.commitValidation?.affectedFilesCount ?? 0}</strong> alteração(ões) versionada(s)</p>
      <p class="card-label">O que será publicado (svn status)</p>
      <ul class="preview-files">${files}</ul>
      <p class="card-label">Mensagem de commit</p>
      <input id="commit-title" class="form-input" type="text" maxlength="72" placeholder="Título descritivo (10 a 72 caracteres)" value="${escapeHtml(suggestedTitle)}" />
      <p id="title-feedback" class="feedback"></p>
      <textarea id="commit-description" class="form-input" maxlength="500" rows="4" placeholder="Descrição opcional (20 a 500 caracteres)"></textarea>
      <p id="description-feedback" class="feedback"></p>
      <label class="checkbox-row">
        <input type="checkbox" id="confirm-commit" />
        Confirmo a publicação oficial destas alterações no repositório SVN.
      </label>
      <div class="stage-actions">
        <button id="execute-commit" class="action-button" disabled>Executar commit SVN</button>
      </div>
      <div data-role="commit-result"></div>
    </div>
  `;

  const titleInput = query<HTMLInputElement>('#commit-title', body)!;
  const descriptionInput = query<HTMLTextAreaElement>('#commit-description', body)!;
  const confirmBox = query<HTMLInputElement>('#confirm-commit', body)!;
  const executeButton = query<HTMLButtonElement>('#execute-commit', body)!;
  const titleFeedback = query<HTMLElement>('#title-feedback', body)!;
  const descriptionFeedback = query<HTMLElement>('#description-feedback', body)!;
  const resultContainer = query<HTMLElement>('[data-role="commit-result"]', body)!;

  const refresh = () => {
    const titleError = validateTitle(titleInput.value.trim());
    const descriptionError = validateDescription(descriptionInput.value.trim());
    titleFeedback.textContent = titleError ?? 'Título válido.';
    titleFeedback.className = titleError ? 'feedback invalid' : 'feedback valid';
    descriptionFeedback.textContent = descriptionError ?? '';
    descriptionFeedback.className = descriptionError ? 'feedback invalid' : 'feedback';
    executeButton.disabled = Boolean(titleError || descriptionError) || !confirmBox.checked;
  };

  titleInput.addEventListener('input', refresh);
  descriptionInput.addEventListener('input', refresh);
  confirmBox.addEventListener('change', refresh);
  refresh();

  executeButton.addEventListener('click', () => {
    void (async () => {
      if (!state.selectedEnvironmentId) {
        setStatusMessage('Selecione um ambiente antes de commitar.');
        return;
      }

      executeButton.disabled = true;
      executeButton.textContent = 'Publicando...';
      setStatusMessage('Executando svn commit...');

      const result = await api().executeCommit(state.selectedEnvironmentId, titleInput.value.trim(), descriptionInput.value.trim());
      executeButton.textContent = 'Executar commit SVN';

      if (result.status === 'success') {
        state.lastApplyResult = undefined;
        state.suggestedCommitTitle = undefined;
        resultContainer.innerHTML = `
          <div class="notice" data-tone="ready">
            <p class="card-label">Commit publicado</p>
            <p class="context-line">Revisão <strong>${escapeHtml(result.revision ?? '?')}</strong> · ${escapeHtml(result.filesCommitted ?? 0)} caminho(s)</p>
          </div>
        `;
        confirmBox.checked = false;
        confirmBox.disabled = true;
        setStatusMessage(result.message);
        return;
      }

      resultContainer.innerHTML = `
        <div class="notice" data-tone="blocked">
          <p class="card-label">${result.status === 'conflict' ? 'Conflito no commit' : 'Commit não realizado'}</p>
          <p class="context-line">${escapeHtml(result.message)}</p>
          ${result.error ? `<pre class="review-markdown">${escapeHtml(result.error)}</pre>` : ''}
        </div>
      `;
      setStatusMessage(result.message);
      refresh();
    })();
  });
}

// ---------------------------------------------------------------------------
// Visão principal (no estilo do GitHub Desktop)

type DesktopTab = 'changes' | 'history';
type ChangeKind = 'added' | 'modified' | 'deleted';

interface ChangeItem {
  path: string;
  kind: ChangeKind;
}

interface CommitDraft {
  commit: string;
  summary: string;
  description: string;
}

interface DesktopState {
  tab: DesktopTab;
  environments?: EnvironmentScreenState;
  screen?: SyncScreenState;
  history?: PackageHistoryResult;
  selectedPath?: string;
  selectedRevision?: string;
  commitDraft?: CommitDraft;
  banner?: { tone: 'success' | 'warning' | 'error'; html: string };
  requestId: number;
}

const desktop: DesktopState = { tab: 'changes', requestId: 0 };

const CHANGE_ICONS: Record<ChangeKind, string> = { added: '+', modified: '•', deleted: '−' };
const CHANGE_LABELS: Record<ChangeKind, string> = { added: 'Criado', modified: 'Modificado', deleted: 'Removido' };

function pendingKind(item: string): ChangeKind {
  if (item === 'added') return 'added';
  if (item === 'deleted' || item === 'missing') return 'deleted';
  return 'modified';
}

function currentChangeItems(): ChangeItem[] {
  const plan = desktop.screen?.plan;

  if (!plan) {
    return [];
  }

  if (plan.status === 'ready') {
    return plan.changes.map((change) => ({ path: change.path, kind: change.kind }));
  }

  if (desktop.screen?.canCommit) {
    return plan.pending.map((change) => ({ path: change.path, kind: pendingKind(change.item) }));
  }

  return [];
}

interface CommittedEntry {
  revision: string;
  title: string;
  recordedAt: string;
}

function committedEntries(): CommittedEntry[] {
  const environmentName = desktop.screen?.environment?.name;

  return (desktop.history?.entries ?? [])
    .filter((entry) => entry.kind === 'committed' && /^r\d+$/.test(entry.packageId))
    .filter((entry) => !environmentName || entry.environmentName === environmentName)
    .map((entry) => ({
      revision: entry.packageId.slice(1),
      title: entry.detail ?? `Revisão ${entry.packageId.slice(1)}`,
      recordedAt: entry.recordedAt
    }));
}

function splitSuggestedMessage(message: string): { summary: string; description: string } {
  const [summary, ...rest] = message.split('\n');
  return { summary: summary.trim(), description: rest.join('\n').trim() };
}

function ensureCommitDraft(): CommitDraft | undefined {
  const source = desktop.screen?.plan?.source;

  if (!source) {
    return undefined;
  }

  if (desktop.commitDraft?.commit !== source.commit) {
    desktop.commitDraft = { commit: source.commit, ...splitSuggestedMessage(desktop.screen?.suggestedCommitMessage ?? '') };
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

  setText('environment-name', desktop.environments?.selected?.name ?? 'Nenhum ambiente');
  setText('git-branch', source ? `${source.branch ?? 'HEAD'} · ${source.shortCommit}` : '-');

  if (plan?.status === 'ready') {
    setText('refresh-label', 'Diferenças com o Git');
    setText('refresh-value', `${plan.changes.length} arquivo(s) a copiar`);
  } else if (screen?.canCommit) {
    setText('refresh-label', 'Pronto para commit');
    setText('refresh-value', `${plan?.pendingSvnChanges ?? 0} alteração(ões) no SVN`);
  } else if (plan?.status === 'up-to-date') {
    setText('refresh-label', 'Verificar alterações');
    setText('refresh-value', 'SVN igual ao Git');
  } else {
    setText('refresh-label', 'Verificar alterações');
    setText('refresh-value', 'Comparar Git com o SVN');
  }

  query<HTMLElement>('[data-role="toggle-advanced"]')?.setAttribute('aria-pressed', String(state.showAdvanced));
}

// Lista lateral -------------------------------------------------------------

function renderChangeRow(item: ChangeItem): string {
  const slash = item.path.lastIndexOf('/');
  const directory = slash >= 0 ? item.path.slice(0, slash + 1) : '';
  const fileName = item.path.slice(slash + 1);

  return `
    <button type="button" class="change-row" data-path="${escapeHtml(item.path)}" aria-selected="${item.path === desktop.selectedPath}" title="${escapeHtml(`${CHANGE_LABELS[item.kind]}: ${item.path}`)}">
      <span class="change-path"><bdi><span class="change-dir">${escapeHtml(directory)}</span>${escapeHtml(fileName)}</bdi></span>
      <span class="change-icon" data-kind="${item.kind}" aria-label="${CHANGE_LABELS[item.kind]}">${CHANGE_ICONS[item.kind]}</span>
    </button>
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
    list.innerHTML = '<p class="list-empty">Nenhum ambiente selecionado.</p>';
    return;
  }

  if (desktop.tab === 'history') {
    const entries = committedEntries();
    list.innerHTML = entries.length === 0
      ? '<p class="list-empty">Nenhuma sincronização publicada ainda.</p>'
      : entries.map((entry) => `
        <button type="button" class="history-row" data-revision="${escapeHtml(entry.revision)}" aria-selected="${entry.revision === desktop.selectedRevision}">
          <span class="history-title">${escapeHtml(entry.title)}</span>
          <span class="history-meta">r${escapeHtml(entry.revision)} · ${escapeHtml(formatDate(entry.recordedAt))}</span>
        </button>
      `).join('');
    return;
  }

  if (items.length === 0) {
    list.innerHTML = '<p class="list-empty">Nenhuma alteração.</p>';
    return;
  }

  const header = desktop.screen.plan?.status === 'ready'
    ? `${items.length} arquivo(s) diferentes do Git`
    : `${items.length} alteração(ões) para publicar no SVN`;

  list.innerHTML = `<div class="list-header">${escapeHtml(header)}</div>${items.map(renderChangeRow).join('')}`;
}

function selectSidebarItem(element: HTMLElement): void {
  if (element.dataset.path) {
    desktop.selectedPath = element.dataset.path;
  } else if (element.dataset.revision) {
    desktop.selectedRevision = element.dataset.revision;
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
    const row = (event.target as HTMLElement).closest<HTMLElement>('.change-row, .history-row');
    if (row) {
      selectSidebarItem(row);
    }
  });

  list?.addEventListener('keydown', (event) => {
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

      if (desktop.tab === 'history' && !desktop.selectedRevision) {
        desktop.selectedRevision = committedEntries()[0]?.revision;
      }

      renderDesktop();
    });
  });
}

// Caixa de commit -----------------------------------------------------------

function renderCommitBox(): void {
  const box = query<HTMLElement>('[data-role="commit-box"]');
  const screen = desktop.screen;
  const plan = screen?.plan;

  if (!box) {
    return;
  }

  if (desktop.tab !== 'changes' || !screen || !plan?.source) {
    box.innerHTML = '';
    return;
  }

  if (plan.status === 'ready') {
    box.innerHTML = `
      <p class="commit-box-hint">O checkout SVN será atualizado para o commit <strong>${escapeHtml(plan.source.shortCommit)}</strong>. Nada é publicado nesta etapa.</p>
      <button type="button" class="button primary block" data-role="copy-to-svn">Copiar ${plan.changes.length} arquivo(s) para o SVN</button>
    `;
    bindClick(box, '[data-role="copy-to-svn"]', copyToSvn);
    return;
  }

  if (!screen.canCommit) {
    box.innerHTML = '';
    return;
  }

  const draft = ensureCommitDraft()!;

  box.innerHTML = `
    <input class="input" data-role="commit-summary" type="text" placeholder="Resumo (obrigatório)" value="${escapeHtml(draft.summary)}" aria-label="Resumo do commit SVN" />
    <textarea class="input" data-role="commit-description" placeholder="Descrição" aria-label="Descrição do commit SVN">${escapeHtml(draft.description)}</textarea>
    <button type="button" class="commit-box-link" data-role="reset-message">Restaurar mensagem sugerida</button>
    <button type="button" class="button primary block" data-role="commit-svn">Commit para o SVN</button>
  `;

  const summary = query<HTMLInputElement>('[data-role="commit-summary"]', box)!;
  const description = query<HTMLTextAreaElement>('[data-role="commit-description"]', box)!;
  const submit = query<HTMLButtonElement>('[data-role="commit-svn"]', box)!;

  const refresh = () => {
    draft.summary = summary.value;
    draft.description = description.value;
    submit.disabled = summary.value.trim().length === 0;
  };

  summary.addEventListener('input', refresh);
  description.addEventListener('input', refresh);
  summary.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !submit.disabled) {
      submit.click();
    }
  });
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
    title: 'Atualizar checkout SVN',
    message: `${plan.totals.added} arquivo(s) serão criados, ${plan.totals.modified} atualizados e ${plan.totals.deleted} removidos em ${plan.svnCheckoutPath}, para ficar igual ao commit ${plan.source.shortCommit}. Nada será publicado no SVN ainda.`,
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
  desktop.screen = response.screen;
  desktop.selectedPath = undefined;
  setStatusMessage(response.result?.message ?? response.screen.message);
  renderDesktop();
}

async function commitToSvn(): Promise<void> {
  const draft = desktop.commitDraft;
  const plan = desktop.screen?.plan;

  if (!draft || !plan) {
    return;
  }

  const message = draft.description.trim() ? `${draft.summary.trim()}\n\n${draft.description.trim()}` : draft.summary.trim();
  const confirmed = await confirmModal({
    title: 'Publicar no SVN',
    message: `${plan.pendingSvnChanges} alteração(ões) serão publicadas oficialmente a partir de ${plan.svnCheckoutPath}.`,
    detail: message,
    confirmLabel: 'Commit para o SVN'
  });

  if (!confirmed) {
    return;
  }

  setStatusMessage('Executando svn commit...');
  const response = await api().commitSync(state.selectedEnvironmentId, message);

  if (response.result.status === 'success') {
    desktop.commitDraft = undefined;
    desktop.banner = {
      tone: 'success',
      html: `<p><strong>Revisão ${escapeHtml(response.result.revision ?? '?')} publicada no SVN</strong> · ${escapeHtml(response.result.filesCommitted ?? 0)} caminho(s)</p>`
    };
    desktop.selectedRevision = response.result.revision;
    desktop.history = await api().readPackageHistory();
  } else {
    desktop.banner = {
      tone: 'error',
      html: `<p><strong>${response.result.status === 'conflict' ? 'Conflito no commit' : 'Commit não realizado'}</strong></p><p>${escapeHtml(response.result.message)}</p>${response.result.error ? `<pre class="review-markdown">${escapeHtml(response.result.error)}</pre>` : ''}`
    };
  }

  desktop.screen = response.screen;
  desktop.selectedPath = undefined;
  setStatusMessage(response.result.message);
  renderDesktop();
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

function suggestion(title: string, description: string, role: string, label: string): string {
  return `
    <div class="suggestion">
      <span class="suggestion-text"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></span>
      <button type="button" class="button" data-role="${role}">${escapeHtml(label)}</button>
    </div>
  `;
}

function bindDetailActions(detail: HTMLElement): void {
  bindClick(detail, '[data-role="add-environment"]', () => openAddEnvironmentModal());
  bindClick(detail, '[data-role="open-svn"]', () => api().openEnvironmentFolder(state.selectedEnvironmentId, 'svn'));
  bindClick(detail, '[data-role="open-git"]', () => api().openEnvironmentFolder(state.selectedEnvironmentId, 'git'));
  bindClick(detail, '[data-role="refresh-detail"]', () => loadDesktop());
  bindClick(detail, '[data-role="open-advanced"]', () => showAdvancedView('environment'));
}

async function renderDiffDetail(detail: HTMLElement, item: ChangeItem, requestId: number): Promise<void> {
  detail.innerHTML = `${renderBanner()}<div class="diff-header">${escapeHtml(item.path)}</div><p class="list-empty">Carregando diff...</p>`;
  const diff = await api().getSyncFileDiff(state.selectedEnvironmentId, item.path);

  if (requestId !== desktop.requestId) {
    return;
  }

  const sourceLabel = diff?.source === 'svn-pending' ? 'Será publicado no SVN' : 'Git → checkout SVN';
  const header = `<div class="diff-header"><span class="change-icon" data-kind="${item.kind}">${CHANGE_ICONS[item.kind]}</span>${escapeHtml(item.path)}<span class="diff-header-source">${escapeHtml(sourceLabel)}</span></div>`;
  let body: string;

  if (!diff || diff.kind === 'empty') {
    body = blankSlate('Sem diferença de conteúdo', item.kind === 'deleted' ? 'O arquivo será removido do SVN.' : 'Não há diferença textual para mostrar.');
  } else if (diff.kind === 'binary') {
    body = blankSlate('Arquivo binário', 'O conteúdo binário não pode ser exibido como diff.');
  } else if (diff.kind === 'directory') {
    body = blankSlate('Pasta', item.kind === 'deleted' ? 'A pasta e todo o conteúdo dela serão removidos do SVN.' : 'A pasta será adicionada ao SVN.');
  } else if (diff.kind === 'too-large') {
    body = blankSlate('Arquivo muito grande', 'O diff não é exibido para arquivos acima de 5 MB.');
  } else {
    body = `${renderDiffTable(diff.lines)}${diff.truncated ? '<p class="list-empty">Diff truncado para exibição.</p>' : ''}`;
  }

  detail.innerHTML = `${renderBanner()}${header}${body}`;
}

async function renderRevisionDetail(detail: HTMLElement, revision: string, requestId: number): Promise<void> {
  detail.innerHTML = '<p class="list-empty">Carregando revisão...</p>';
  const log = await api().getSvnRevisionLog(state.selectedEnvironmentId, revision);

  if (requestId !== desktop.requestId) {
    return;
  }

  if (!log.ok) {
    detail.innerHTML = `${renderBanner()}${blankSlate(`Revisão ${revision}`, log.message)}`;
    return;
  }

  const [title, ...rest] = (log.logMessage ?? '').split('\n');
  const actionKind: Record<string, ChangeKind> = { A: 'added', D: 'deleted', M: 'modified', R: 'modified' };

  detail.innerHTML = `
    ${renderBanner()}
    <div class="detail-section">
      <h2>${escapeHtml(title || `Revisão ${revision}`)}</h2>
      <p class="detail-meta">r${escapeHtml(revision)} · ${escapeHtml(log.author ?? 'autor desconhecido')} · ${escapeHtml(formatDate(log.date))} · ${log.paths.length} caminho(s)</p>
      ${rest.join('\n').trim() ? `<p class="commit-message-view">${escapeHtml(rest.join('\n').trim())}</p>` : ''}
    </div>
    <ul class="path-list">
      ${log.paths.map((entry) => {
        const kind = actionKind[entry.action] ?? 'modified';
        return `<li><span class="change-icon" data-kind="${kind}">${CHANGE_ICONS[kind]}</span>${escapeHtml(entry.path)}</li>`;
      }).join('')}
    </ul>
  `;
}

async function renderDetail(): Promise<void> {
  const detail = query<HTMLElement>('[data-role="detail"]');
  const requestId = ++desktop.requestId;

  if (!detail) {
    return;
  }

  if (!desktop.environments || desktop.environments.items.length === 0) {
    detail.innerHTML = blankSlate(
      'Comece adicionando um ambiente',
      'Um ambiente liga a pasta do seu repositório Git à pasta do checkout SVN que recebe o código.',
      `<div class="suggestions">${suggestion('Adicionar ambiente', 'Escolha o repositório Git e o checkout SVN.', 'add-environment', 'Adicionar…')}</div>`
    );
    bindDetailActions(detail);
    return;
  }

  const plan = desktop.screen?.plan;

  if (desktop.tab === 'history') {
    if (desktop.selectedRevision) {
      await renderRevisionDetail(detail, desktop.selectedRevision, requestId);
    } else {
      detail.innerHTML = `${renderBanner()}${blankSlate('Histórico', committedEntries().length > 0 ? 'Selecione uma sincronização para ver os arquivos publicados.' : 'As sincronizações publicadas aparecem aqui.')}`;
    }
    return;
  }

  if (!plan || plan.status === 'blocked') {
    detail.innerHTML = `
      ${renderBanner()}
      ${blankSlate(
        'Sincronização bloqueada',
        desktop.screen?.message ?? 'Não foi possível ler o ambiente.',
        `<div class="banner" data-tone="error"><ul>${(plan?.blockers ?? []).map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join('')}</ul></div>
         <div class="suggestions">
           ${suggestion('Abrir checkout SVN', 'Resolva conflitos ou problemas direto na pasta.', 'open-svn', 'Abrir pasta')}
           ${suggestion('Revisar ambiente', 'Confira os caminhos e valide o ambiente no modo avançado.', 'open-advanced', 'Abrir')}
         </div>`
      )}
    `;
    bindDetailActions(detail);
    return;
  }

  const items = currentChangeItems();
  const selected = items.find((item) => item.path === desktop.selectedPath);

  if (selected) {
    await renderDiffDetail(detail, selected, requestId);
    return;
  }

  const title = items.length > 0
    ? (plan.status === 'ready' ? `${items.length} arquivo(s) diferentes do Git` : 'Pronto para commit')
    : 'Nenhuma alteração';

  detail.innerHTML = `
    ${renderBanner()}
    ${renderWarnings(plan)}
    ${blankSlate(
      title,
      items.length > 0 ? 'Selecione um arquivo para ver o diff.' : plan.message,
      `<div class="suggestions">
        ${suggestion('Abrir checkout SVN', plan.svnCheckoutPath, 'open-svn', 'Abrir pasta')}
        ${suggestion('Abrir repositório Git', plan.gitWorkspacePath, 'open-git', 'Abrir pasta')}
        ${items.length === 0 ? suggestion('Verificar novamente', 'Depois de um novo commit no Git, compare de novo.', 'refresh-detail', 'Verificar') : ''}
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
    setStatusMessage('Comparando Git com o checkout SVN...');
  }
  const refresh = query<HTMLButtonElement>('[data-role="refresh"]');

  if (refresh) {
    refresh.disabled = true;
  }

  try {
    desktop.environments = await api().getEnvironmentScreenState(state.selectedEnvironmentId);
    state.selectedEnvironmentId = desktop.environments.selectedEnvironmentId;

    const hasEnvironment = desktop.environments.items.length > 0;
    [desktop.screen, desktop.history] = await Promise.all([
      hasEnvironment ? api().getSyncScreenState(state.selectedEnvironmentId) : Promise.resolve(undefined),
      api().readPackageHistory()
    ]);

    if (!currentChangeItems().some((item) => item.path === desktop.selectedPath)) {
      desktop.selectedPath = undefined;
    }

    if (!options.quiet) {
      setStatusMessage(desktop.screen?.message ?? 'Adicione um ambiente para começar.');
    }
  } catch (error) {
    setStatusMessage(`Falha ao carregar: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
  } finally {
    if (refresh) {
      refresh.disabled = false;
    }
  }

  renderDesktop();
}

// Menu de ambientes ---------------------------------------------------------

function closeEnvironmentMenu(): void {
  query<HTMLElement>('[data-role="environment-menu"]')?.setAttribute('hidden', '');
  query<HTMLElement>('[data-role="environment-picker"]')?.setAttribute('aria-expanded', 'false');
}

function toggleEnvironmentMenu(): void {
  const menu = query<HTMLElement>('[data-role="environment-menu"]');
  const picker = query<HTMLElement>('[data-role="environment-picker"]');

  if (!menu || !picker) {
    return;
  }

  if (!menu.hidden) {
    closeEnvironmentMenu();
    return;
  }

  const environments = desktop.environments;
  const items = (environments?.items ?? []).map((item) => `
    <li>
      <button type="button" class="dropdown-item" data-environment-id="${escapeHtml(item.id)}" aria-current="${item.id === environments?.selectedEnvironmentId}">
        <span class="dropdown-item-text"><span>${escapeHtml(item.name)}</span></span>
      </button>
    </li>
  `).join('');

  menu.innerHTML = `
    <div class="dropdown-header">Ambientes</div>
    <ul class="dropdown-list">${items || '<li class="list-empty">Nenhum ambiente cadastrado.</li>'}</ul>
    <div class="dropdown-footer">
      <button type="button" class="button primary" data-role="menu-add">Adicionar ambiente…</button>
      ${environments?.selected ? `<button type="button" class="button danger" data-role="menu-remove">Remover da lista</button>` : ''}
    </div>
  `;
  menu.hidden = false;
  picker.setAttribute('aria-expanded', 'true');

  bindClick(menu, '[data-environment-id]', async (button) => {
    closeEnvironmentMenu();
    state.selectedEnvironmentId = button.dataset.environmentId;
    desktop.selectedPath = undefined;
    desktop.selectedRevision = undefined;
    desktop.commitDraft = undefined;
    desktop.banner = undefined;
    await loadDesktop({ quiet: state.showAdvanced });

    if (state.showAdvanced) {
      await renderActiveStage();
    }
  });

  bindClick(menu, '[data-role="menu-add"]', () => {
    closeEnvironmentMenu();
    openAddEnvironmentModal();
  });

  bindClick(menu, '[data-role="menu-remove"]', async () => {
    closeEnvironmentMenu();
    const selected = desktop.environments?.selected;

    if (!selected || !(await confirmModal({
      title: 'Remover ambiente',
      message: `Remover "${selected.name}" da lista? As pastas do Git e do SVN não serão apagadas.`,
      confirmLabel: 'Remover',
      danger: true
    }))) {
      return;
    }

    await api().removeEnvironment(selected.id);
    state.selectedEnvironmentId = undefined;
    desktop.banner = undefined;
    await loadDesktop();
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
      <div class="modal-header">Adicionar ambiente</div>
      <div class="modal-body">
        <label class="modal-field">Repositório Git
          <span class="input-row">
            <input class="input" name="gitWorkspacePath" type="text" placeholder="Pasta do repositório Git local" required />
            <button type="button" class="button" data-role="pick-git">Escolher…</button>
          </span>
        </label>
        <label class="modal-field">Checkout SVN
          <span class="input-row">
            <input class="input" name="svnCheckoutPath" type="text" placeholder="Pasta do checkout SVN" required />
            <button type="button" class="button" data-role="pick-svn">Escolher…</button>
          </span>
          <small>Faça o checkout uma vez com svn checkout; o SVNFlow mantém essa pasta igual ao Git.</small>
        </label>
        <label class="modal-field">Nome
          <input class="input" name="name" type="text" placeholder="Usa o nome da pasta Git quando vazio" />
        </label>
        <p class="modal-error" data-role="add-environment-error" hidden></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="button" data-role="modal-cancel">Cancelar</button>
        <button type="submit" class="button primary">Adicionar ambiente</button>
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
  input('gitWorkspacePath').focus();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const submit = query<HTMLButtonElement>('button[type="submit"]', form)!;
      submit.disabled = true;
      setStatusMessage('Validando repositório Git e checkout SVN...');

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

// Troca de visão ------------------------------------------------------------

function showDesktopView(): void {
  state.showAdvanced = false;
  writeShowAdvanced(false);
  query<HTMLElement>('[data-role="desktop-view"]')!.hidden = false;
  query<HTMLElement>('[data-role="advanced-view"]')!.hidden = true;
  void loadDesktop();
}

function showAdvancedView(stage: StageKey = state.activeStage): void {
  state.showAdvanced = true;
  writeShowAdvanced(true);
  state.activeStage = stage;
  closeEnvironmentMenu();
  query<HTMLElement>('[data-role="desktop-view"]')!.hidden = true;
  query<HTMLElement>('[data-role="advanced-view"]')!.hidden = false;
  renderToolbar();
  renderNavigation();
  void renderActiveStage();
  // Mantém a barra superior atualizada também no modo avançado.
  void loadDesktop({ quiet: true });
}

function bindDesktopShell(): void {
  bindSidebar();

  query<HTMLButtonElement>('[data-role="environment-picker"]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleEnvironmentMenu();
  });

  query<HTMLButtonElement>('[data-role="refresh"]')?.addEventListener('click', () => {
    desktop.banner = undefined;
    if (state.showAdvanced) {
      void renderActiveStage();
    } else {
      void loadDesktop();
    }
  });

  query<HTMLButtonElement>('[data-role="toggle-advanced"]')?.addEventListener('click', () => {
    if (state.showAdvanced) {
      showDesktopView();
    } else {
      showAdvancedView('environment');
    }
  });

  document.addEventListener('click', (event) => {
    const menu = query<HTMLElement>('[data-role="environment-menu"]');
    if (menu && !menu.hidden && !menu.contains(event.target as Node)) {
      closeEnvironmentMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeEnvironmentMenu();
      closeActiveModal?.();
    }
  });
}

// ---------------------------------------------------------------------------
// Histórico

function renderHistoryStage(result: PackageHistoryResult): void {
  const body = stageBody();

  if (!result.ok || result.entries.length === 0) {
    body.innerHTML = '<p class="empty-state">Nenhum evento registrado ainda. O histórico é preenchido a cada commit SVN e, no modo avançado, ao exportar, importar e aplicar pacotes.</p>';
    setStatusMessage('Histórico vazio.');
    return;
  }

  const rows = result.entries.map((entry) => {
    const kind = HISTORY_KIND_LABELS[entry.kind] ?? HISTORY_KIND_LABELS.unknown;
    return `
      <tr>
        <td>${badge(kind.kind, kind.label)}</td>
        <td>${escapeHtml(entry.detail ?? entry.packageId)}</td>
        <td>${escapeHtml(entry.environmentName)}</td>
        <td>${escapeHtml(entry.baseBranch)}</td>
        <td>${escapeHtml(entry.totalAffectedFiles)}</td>
        <td title="${escapeHtml(entry.packagePath)}">${escapeHtml(entry.packagePath ? entry.packagePath.split(/[\\/]/).pop() : '-')}</td>
        <td>${escapeHtml(formatDate(entry.recordedAt))}</td>
      </tr>
    `;
  }).join('');

  body.innerHTML = `
    <p class="hint">${result.entries.length} registro(s) em ${escapeHtml(result.storagePath)}</p>
    <table class="history-table">
      <thead>
        <tr><th>Evento</th><th>Descrição</th><th>Ambiente</th><th>Base</th><th>Arquivos</th><th>Pacote</th><th>Registrado em</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  setStatusMessage(`${result.entries.length} evento(s) no histórico local.`);
}

// ---------------------------------------------------------------------------
// Navegação

async function renderActiveStage(): Promise<void> {
  const stage = STAGES.find((item) => item.key === state.activeStage) ?? STAGES[0];
  const title = query<HTMLElement>('[data-role="stage-title"]');
  const description = query<HTMLElement>('[data-role="stage-description"]');
  const body = stageBody();

  if (title) {
    title.textContent = stage.label;
  }

  if (description) {
    description.textContent = stage.description;
  }

  body.innerHTML = '<p class="empty-state">Carregando...</p>';

  try {
    const desktopApi = api();
    const environmentId = state.selectedEnvironmentId;

    if (stage.key === 'environment') {
      renderEnvironmentStage(await desktopApi.getEnvironmentScreenState(environmentId));
    } else if (stage.key === 'workspace') {
      renderWorkspaceStage(await desktopApi.getWorkspaceScreenState(environmentId));
    } else if (stage.key === 'preview') {
      renderPreviewStage(await desktopApi.getPreviewScreenState(environmentId));
    } else if (stage.key === 'packages') {
      renderPackagesStage(await desktopApi.getPackagesScreenState(environmentId));
    } else if (stage.key === 'apply') {
      await renderApplyStage();
    } else if (stage.key === 'commit') {
      renderCommitStage(await desktopApi.getCommitScreenState(environmentId));
    } else {
      renderHistoryStage(await desktopApi.readPackageHistory());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido.';
    body.innerHTML = `<div class="notice" data-tone="blocked"><p>Falha ao carregar a etapa: ${escapeHtml(message)}</p></div>`;
    setStatusMessage('Falha ao carregar etapa.');
  }
}

function renderNavigation(): void {
  const stageList = query<HTMLElement>('[data-role="stage-list"]');

  if (!stageList) {
    return;
  }

  stageList.innerHTML = '';

  for (const stage of STAGES) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stage-button';
    button.dataset.state = stage.key === state.activeStage ? 'active' : 'available';
    button.innerHTML = `${escapeHtml(stage.label)}<small>${escapeHtml(stage.helper)}</small>`;
    button.addEventListener('click', () => {
      void goToStage(stage.key);
    });

    li.appendChild(button);
    stageList.appendChild(li);
  }
}

function renderAppBootstrap(): void {
  const version = query<HTMLElement>('[data-role="app-version"]');

  if (version) {
    version.textContent = `SVNFlow ${window.svnflowDesktop?.appVersion ?? 'dev'}`;
  }

  bindDesktopShell();

  if (state.showAdvanced) {
    showAdvancedView('environment');
  } else {
    showDesktopView();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  renderAppBootstrap();
});

export {};
