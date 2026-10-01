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

type StageKey = 'environment' | 'sync' | 'workspace' | 'preview' | 'packages' | 'apply' | 'commit' | 'history';

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
    key: 'sync',
    label: 'Sincronizar',
    description: 'Deixa o checkout SVN igual ao último commit do Git e publica com um commit SVN.',
    helper: 'Git → checkout SVN → commit.'
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
  syncCommitDraft?: { commit: string; message: string };
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
      <button class="action-button secondary" data-role="next-stage">Seguir para Sincronizar</button>
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

  bindClick(body, '[data-role="next-stage"]', () => goToStage('sync'));

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
// Sincronizar

const MAX_SYNC_ROWS = 400;

function renderSyncChanges(plan: SyncPlan): string {
  const labels: Record<string, { label: string; kind: EnvironmentVisualStatus }> = {
    added: { label: 'Criar', kind: 'ready' },
    modified: { label: 'Atualizar', kind: 'attention' },
    deleted: { label: 'Remover', kind: 'error' }
  };
  const rows = plan.changes
    .slice(0, MAX_SYNC_ROWS)
    .map((change) => `<li class="preview-row">${badge(labels[change.kind].kind, labels[change.kind].label)}<span>${escapeHtml(change.path)}</span></li>`)
    .join('');
  const hidden = plan.changes.length - MAX_SYNC_ROWS;

  return `<ul class="preview-files">${rows}</ul>${hidden > 0 ? `<p class="hint">E mais ${hidden} arquivo(s).</p>` : ''}`;
}

function renderSyncWarnings(plan: SyncPlan): string {
  if (plan.warnings.length === 0) {
    return '';
  }

  return `<div class="notice" data-tone="attention"><p class="card-label">Atenção</p><ul class="preview-list">${plan.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>`;
}

function renderSyncCommitForm(screen: SyncScreenState): string {
  const plan = screen.plan!;
  const commit = plan.source!.commit;

  if (state.syncCommitDraft?.commit !== commit) {
    state.syncCommitDraft = { commit, message: screen.suggestedCommitMessage ?? '' };
  }

  return `
    <div class="notice" data-tone="ready">
      <p class="card-label">Pronto para commit SVN</p>
      <p class="context-line">O checkout está igual ao commit <strong>${escapeHtml(plan.source!.shortCommit)}</strong>, com <strong>${plan.pendingSvnChanges}</strong> alteração(ões) aguardando publicação.</p>
    </div>
    ${renderSyncWarnings(plan)}
    <form class="form-grid" data-role="sync-commit-form">
      <label class="field">
        <span>Mensagem do commit SVN (sugerida a partir dos commits Git — edite à vontade)</span>
        <textarea class="form-input commit-message" name="message" rows="8">${escapeHtml(state.syncCommitDraft.message)}</textarea>
      </label>
      <p class="feedback" data-role="sync-commit-feedback"></p>
      <div class="stage-actions">
        <button class="action-button secondary" type="button" data-role="reset-message">Restaurar sugestão</button>
      </div>
      <label class="checkbox-row">
        <input type="checkbox" name="confirm" />
        Confirmo a publicação oficial destas alterações no repositório SVN.
      </label>
      <div class="stage-actions">
        <button class="action-button" type="submit" disabled>Commitar no SVN</button>
      </div>
      <div data-role="sync-commit-result"></div>
    </form>
  `;
}

function bindSyncCommitForm(root: HTMLElement, screen: SyncScreenState): void {
  const form = query<HTMLFormElement>('[data-role="sync-commit-form"]', root);

  if (!form) {
    return;
  }

  const textarea = form.elements.namedItem('message') as HTMLTextAreaElement;
  const confirmBox = form.elements.namedItem('confirm') as HTMLInputElement;
  const submit = query<HTMLButtonElement>('button[type="submit"]', form)!;
  const feedback = query<HTMLElement>('[data-role="sync-commit-feedback"]', form)!;
  const resultContainer = query<HTMLElement>('[data-role="sync-commit-result"]', form)!;

  const refresh = () => {
    const message = textarea.value.trim();
    if (state.syncCommitDraft) {
      state.syncCommitDraft.message = textarea.value;
    }
    feedback.textContent = message ? '' : 'A mensagem do commit não pode ficar vazia.';
    feedback.className = message ? 'feedback' : 'feedback invalid';
    submit.disabled = !message || !confirmBox.checked;
  };

  textarea.addEventListener('input', refresh);
  confirmBox.addEventListener('change', refresh);
  refresh();

  bindClick(form, '[data-role="reset-message"]', () => {
    textarea.value = screen.suggestedCommitMessage ?? '';
    refresh();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      submit.disabled = true;
      submit.textContent = 'Publicando...';
      setStatusMessage('Executando svn commit...');

      const response = await api().commitSync(state.selectedEnvironmentId, textarea.value);

      if (response.result.status === 'success') {
        state.syncCommitDraft = undefined;
        renderSyncStage(response.screen, `
          <div class="notice" data-tone="ready">
            <p class="card-label">Commit SVN publicado</p>
            <p class="context-line">Revisão <strong>${escapeHtml(response.result.revision ?? '?')}</strong> · ${escapeHtml(response.result.filesCommitted ?? 0)} caminho(s)</p>
          </div>
        `);
        return;
      }

      submit.textContent = 'Commitar no SVN';
      resultContainer.innerHTML = `
        <div class="notice" data-tone="blocked">
          <p class="card-label">${response.result.status === 'conflict' ? 'Conflito no commit' : 'Commit não realizado'}</p>
          <p class="context-line">${escapeHtml(response.result.message)}</p>
          ${response.result.error ? `<pre class="review-markdown">${escapeHtml(response.result.error)}</pre>` : ''}
        </div>
      `;
      setStatusMessage(response.result.message);
      refresh();
    })();
  });
}

function renderSyncStage(screen: SyncScreenState, banner = ''): void {
  const body = stageBody();
  const plan = screen.plan;
  setStatusMessage(screen.message);

  if (!screen.environment || !plan) {
    body.innerHTML = `
      <p class="empty-state">${escapeHtml(screen.message)}</p>
      <div class="stage-actions"><button class="action-button" data-role="go-environment">Cadastrar ambiente</button></div>
    `;
    bindClick(body, '[data-role="go-environment"]', () => goToStage('environment'));
    return;
  }

  updateContext({
    status: plan.status === 'ready' ? 'Diferenças encontradas' : plan.status === 'up-to-date' ? 'Sincronizado' : 'Bloqueado',
    git: screen.environment.gitWorkspacePath,
    svn: screen.environment.svnCheckoutPath,
    base: plan.source ? `${plan.source.branch ?? 'HEAD'} @ ${plan.source.shortCommit}` : '-',
    guard: plan.canSync ? 'Atualizar o checkout exige confirmação' : screen.canCommit ? 'Commit exige confirmação' : 'Nada pendente'
  });

  const source = plan.source
    ? `
      <div class="preview-summary">
        <p class="context-line">Git: <strong>${escapeHtml(plan.source.branch ?? 'HEAD')}</strong> @ <strong>${escapeHtml(plan.source.shortCommit)}</strong> — ${escapeHtml(plan.source.subject)}</p>
        <p class="context-line">Checkout SVN: <strong>${escapeHtml(screen.environment.svnCheckoutPath)}</strong></p>
        <p class="context-line">Última sincronização publicada: <strong>${escapeHtml(screen.lastSyncedCommit ? screen.lastSyncedCommit.slice(0, 7) : 'nenhuma ainda')}</strong></p>
      </div>
    `
    : '';

  let content = '';

  if (plan.status === 'blocked') {
    content = `<div class="notice" data-tone="blocked"><p class="card-label">Sincronização bloqueada</p><ul class="preview-list">${plan.blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join('')}</ul></div>`;
  } else if (plan.status === 'ready') {
    content = `
      <p class="context-line">Para o checkout ficar igual ao Git: <strong>${plan.totals.added}</strong> a criar, <strong>${plan.totals.modified}</strong> a atualizar, <strong>${plan.totals.deleted}</strong> a remover.</p>
      ${renderSyncChanges(plan)}
      ${renderSyncWarnings(plan)}
      ${plan.pendingSvnChanges > 0 ? `<p class="hint">O checkout já tinha ${plan.pendingSvnChanges} alteração(ões) não commitada(s); arquivos que existem no Git serão sobrescritos.</p>` : ''}
      <label class="checkbox-row">
        <input type="checkbox" data-role="confirm-sync" />
        Copiar o commit ${escapeHtml(plan.source?.shortCommit)} para o checkout SVN local. Nada é publicado nesta etapa.
      </label>
      <div class="stage-actions">
        <button class="action-button" data-role="execute-sync" disabled>Atualizar checkout SVN</button>
      </div>
    `;
  } else if (screen.canCommit) {
    content = renderSyncCommitForm(screen);
  } else {
    content = `
      <div class="notice" data-tone="ready">
        <p class="card-label">Tudo sincronizado</p>
        <p class="context-line">${escapeHtml(plan.message)}</p>
      </div>
      ${renderSyncWarnings(plan)}
    `;
  }

  body.innerHTML = `
    ${banner}
    ${source}
    ${content}
    <div class="stage-actions"><button class="action-button secondary" data-role="refresh-sync">Verificar novamente</button></div>
  `;

  bindClick(body, '[data-role="refresh-sync"]', () => renderActiveStage());
  bindSyncCommitForm(body, screen);

  const confirmBox = query<HTMLInputElement>('[data-role="confirm-sync"]', body);
  const executeButton = query<HTMLButtonElement>('[data-role="execute-sync"]', body);

  confirmBox?.addEventListener('change', () => {
    if (executeButton) {
      executeButton.disabled = !confirmBox.checked;
    }
  });

  executeButton?.addEventListener('click', () => {
    void (async () => {
      executeButton.disabled = true;
      executeButton.textContent = 'Copiando arquivos...';
      setStatusMessage('Atualizando checkout SVN com o commit Git...');

      const response = await api().executeSync(state.selectedEnvironmentId);
      const errors = response.result?.errors ?? [];
      renderSyncStage(response.screen, errors.length > 0
        ? `<div class="notice" data-tone="blocked"><p class="card-label">Erros ao atualizar o checkout</p><ul class="preview-list">${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul></div>`
        : '');
    })();
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
    const desktop = api();
    const environmentId = state.selectedEnvironmentId;

    if (stage.key === 'environment') {
      renderEnvironmentStage(await desktop.getEnvironmentScreenState(environmentId));
    } else if (stage.key === 'sync') {
      renderSyncStage(await desktop.getSyncScreenState(environmentId));
    } else if (stage.key === 'workspace') {
      renderWorkspaceStage(await desktop.getWorkspaceScreenState(environmentId));
    } else if (stage.key === 'preview') {
      renderPreviewStage(await desktop.getPreviewScreenState(environmentId));
    } else if (stage.key === 'packages') {
      renderPackagesStage(await desktop.getPackagesScreenState(environmentId));
    } else if (stage.key === 'apply') {
      await renderApplyStage();
    } else if (stage.key === 'commit') {
      renderCommitStage(await desktop.getCommitScreenState(environmentId));
    } else {
      renderHistoryStage(await desktop.readPackageHistory());
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

  const visible = STAGES.filter((stage) => !stage.advanced || state.showAdvanced);

  visible.forEach((stage) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stage-button';
    button.dataset.state = stage.key === state.activeStage ? 'active' : 'available';
    button.innerHTML = `${escapeHtml(stage.label)}<small>${escapeHtml(stage.advanced ? `Avançado · ${stage.helper}` : stage.helper)}</small>`;
    button.addEventListener('click', () => {
      void goToStage(stage.key);
    });

    li.appendChild(button);
    stageList.appendChild(li);
  });

  const toggleItem = document.createElement('li');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'advanced-toggle';
  toggle.textContent = state.showAdvanced ? 'Ocultar modo avançado' : 'Modo avançado (patch e pacotes .svnflow)';
  toggle.addEventListener('click', () => {
    state.showAdvanced = !state.showAdvanced;
    writeShowAdvanced(state.showAdvanced);

    if (!state.showAdvanced && STAGES.find((stage) => stage.key === state.activeStage)?.advanced) {
      void goToStage('sync');
      return;
    }

    renderNavigation();
  });
  toggleItem.appendChild(toggle);
  stageList.appendChild(toggleItem);
}

async function renderAppBootstrap(): Promise<void> {
  const title = query<HTMLElement>('[data-role="app-title"]');
  const subtitle = query<HTMLElement>('[data-role="app-subtitle"]');

  if (title) {
    title.textContent = window.svnflowDesktop?.appName ?? 'SVNFlow';
  }

  if (subtitle) {
    subtitle.textContent = `Do Git para o SVN · versão ${window.svnflowDesktop?.appVersion ?? 'dev'}`;
  }

  try {
    const environments = await api().getEnvironmentScreenState();
    state.selectedEnvironmentId = environments.selectedEnvironmentId;
    state.activeStage = environments.items.length > 0 ? 'sync' : 'environment';
  } catch {
    state.activeStage = 'environment';
  }

  renderNavigation();
  await renderActiveStage();
}

window.addEventListener('DOMContentLoaded', () => {
  void renderAppBootstrap();
});

export {};
