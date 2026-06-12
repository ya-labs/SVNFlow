declare global {
  interface Window {
    svnflowDesktop?: {
      appName: string;
      shellStatus: string;
      getEnvironmentScreenState?: (environmentId?: string) => Promise<EnvironmentScreenState>;
      revalidateEnvironment?: (environmentId?: string) => Promise<EnvironmentScreenState>;
      getPreviewScreenState?: (environmentId?: string) => Promise<PreviewScreenState>;
    };
  }
}

type EnvironmentVisualStatus = 'ready' | 'attention' | 'blocked' | 'error' | 'pending';

interface EnvironmentScreenState {
  message: string;
  items: Array<{
    id: string;
    name: string;
    needsRevalidation: boolean;
    visualStatus: EnvironmentVisualStatus;
  }>;
  selectedEnvironmentId?: string;
  selected?: {
    id: string;
    name: string;
    gitWorkspacePath: string;
    svnCheckoutPath: string;
    visualStatus: EnvironmentVisualStatus;
  };
  emptyState: boolean;
  canAdvanceToSensitiveOperations: boolean;
}

interface PreviewScreenState {
  status: 'ready' | 'blocked';
  title: string;
  message: string;
  environment?: {
    environmentName: string;
    gitWorkspacePath: string;
    svnCheckoutPath: string;
    svnCheckoutRoot?: string;
  };
  workspace?: {
    branch?: string;
    baseBranch: string;
    totalAffectedFiles: number;
    files: Array<{
      path: string;
      previousPath?: string;
      status: string;
      description: string;
      rawStatus: string;
    }>;
  };
  blockers: Array<{ code: string; message: string; affectedFiles?: string[] }>;
  alerts: Array<{ code: string; message: string; severity: 'info' | 'warning'; affectedFiles?: string[] }>;
  canApplyInSvn: boolean;
}

type StageKey = 'environment' | 'workspace' | 'preview' | 'apply' | 'commit' | 'packages' | 'history';

type StageMode = 'available' | 'placeholder' | 'blocked';

interface StageDefinition {
  key: StageKey;
  label: string;
  mode: StageMode;
  description: string;
  helper: string;
}

const STAGES: StageDefinition[] = [
  {
    key: 'environment',
    label: 'Ambiente',
    mode: 'available',
    description: 'Selecione, valide e revalide o ambiente local para iniciar o fluxo com segurança.',
    helper: 'Etapa disponível para navegação visual nesta entrega.'
  },
  {
    key: 'workspace',
    label: 'Workspace Git',
    mode: 'placeholder',
    description: 'Área reservada para inspeção do workspace Git e validações prévias de alterações.',
    helper: 'Placeholder visual: sem execução de operações sensíveis nesta etapa.'
  },
  {
    key: 'preview',
    label: 'Preview',
    mode: 'available',
    description: 'Visualização das alterações Git antes de qualquer aplicação no checkout SVN.',
    helper: 'Exibe arquivos afetados, riscos e bloqueios do preview.'
  },
  {
    key: 'apply',
    label: 'Aplicação SVN',
    mode: 'blocked',
    description: 'Aplicação SVN só será habilitada após etapa de preview concluída com segurança.',
    helper: 'Bloqueado até etapas anteriores concluídas.'
  },
  {
    key: 'commit',
    label: 'Commit SVN',
    mode: 'blocked',
    description: 'Commit protegido permanece indisponível até confirmação da aplicação no checkout SVN.',
    helper: 'Bloqueado para evitar operações indevidas.'
  },
  {
    key: 'packages',
    label: 'Pacotes',
    mode: 'placeholder',
    description: 'Área de pacotes será conectada ao histórico operacional em entregas seguintes.',
    helper: 'Placeholder visual para navegação da V1.'
  },
  {
    key: 'history',
    label: 'Histórico',
    mode: 'placeholder',
    description: 'Histórico local de operações e publicações aparecerá aqui nas próximas implementações.',
    helper: 'Placeholder visual para rota de histórico.'
  }
];

let activeStage: StageKey = 'environment';
let selectedEnvironmentId: string | undefined;

function escapeHtml(value: string): string {
  return value
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');
}

function getVisualStatusLabel(status: EnvironmentVisualStatus): string {
  if (status === 'ready') {
    return 'Pronto';
  }

  if (status === 'attention') {
    return 'Atenção';
  }

  if (status === 'blocked') {
    return 'Bloqueado';
  }

  if (status === 'error') {
    return 'Erro';
  }

  return 'Pendente';
}

function setStatusMessage(message: string): void {
  const status = document.querySelector<HTMLElement>('[data-role="app-status"]');

  if (status) {
    status.textContent = message;
  }
}

function renderEmptyEnvironmentState(message: string): void {
  const stageBody = document.querySelector<HTMLElement>('[data-role="stage-body"]');
  const environmentStatus = document.querySelector<HTMLElement>('[data-role="environment-status"]');
  const environmentGit = document.querySelector<HTMLElement>('[data-role="environment-git"]');
  const environmentSvn = document.querySelector<HTMLElement>('[data-role="environment-svn"]');
  const advanceGuard = document.querySelector<HTMLElement>('[data-role="advance-guard"]');

  if (stageBody) {
    stageBody.innerHTML = `<p class="empty-state">${message}</p>`;
  }

  if (environmentStatus) {
    environmentStatus.textContent = 'Pendente';
  }

  if (environmentGit) {
    environmentGit.textContent = 'Aguardando ambiente salvo';
  }

  if (environmentSvn) {
    environmentSvn.textContent = 'Aguardando ambiente salvo';
  }

  if (advanceGuard) {
    advanceGuard.textContent = 'Operações sensíveis bloqueadas';
  }
}

function renderEnvironmentStage(screen: EnvironmentScreenState): void {
  const stageBody = document.querySelector<HTMLElement>('[data-role="stage-body"]');
  const environmentStatus = document.querySelector<HTMLElement>('[data-role="environment-status"]');
  const environmentGit = document.querySelector<HTMLElement>('[data-role="environment-git"]');
  const environmentSvn = document.querySelector<HTMLElement>('[data-role="environment-svn"]');
  const advanceGuard = document.querySelector<HTMLElement>('[data-role="advance-guard"]');

  setStatusMessage(screen.message);

  if (screen.emptyState || screen.items.length === 0) {
    renderEmptyEnvironmentState('Nenhum ambiente salvo encontrado. Cadastre um ambiente para continuar.');
    return;
  }

  if (environmentStatus) {
    environmentStatus.textContent = getVisualStatusLabel(screen.selected?.visualStatus ?? 'pending');
  }

  if (environmentGit) {
    environmentGit.textContent = screen.selected?.gitWorkspacePath ?? 'Não informado';
  }

  if (environmentSvn) {
    environmentSvn.textContent = screen.selected?.svnCheckoutPath ?? 'Não informado';
  }

  if (advanceGuard) {
    advanceGuard.textContent = screen.canAdvanceToSensitiveOperations
      ? 'Ambiente válido para avanço controlado'
      : 'Operações sensíveis bloqueadas até validação';
  }

  if (!stageBody) {
    return;
  }

  const listItems = screen.items.map((item) => {
    const statusLabel = getVisualStatusLabel(item.visualStatus);
    const needsRevalidation = item.needsRevalidation ? 'Revalidação necessária' : 'Validação atualizada';

    return `
      <li>
        <button class="environment-item" data-role="environment-item" data-environment-id="${item.id}" data-selected="${item.id === screen.selectedEnvironmentId}">
          <span>
            <span class="environment-name">${item.name}</span>
            <span class="environment-meta">${needsRevalidation}</span>
          </span>
          <span class="status-badge" data-kind="${item.visualStatus}">${statusLabel}</span>
        </button>
      </li>
    `;
  }).join('');

  stageBody.innerHTML = `
    <ul class="environment-list">${listItems}</ul>
    <div class="stage-actions">
      <button class="action-button" data-role="revalidate-action" ${screen.selectedEnvironmentId ? '' : 'disabled'}>
        Validar ou revalidar ambiente selecionado
      </button>
    </div>
  `;

  const itemButtons = stageBody.querySelectorAll<HTMLButtonElement>('[data-role="environment-item"]');

  itemButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const environmentId = button.dataset.environmentId;

      if (!environmentId || !window.svnflowDesktop?.getEnvironmentScreenState) {
        return;
      }

      selectedEnvironmentId = environmentId;
      setStatusMessage('Carregando dados do ambiente selecionado...');
      const updated = await window.svnflowDesktop.getEnvironmentScreenState(environmentId);
      selectedEnvironmentId = updated.selectedEnvironmentId;
      renderEnvironmentStage(updated);
    });
  });

  const revalidateButton = stageBody.querySelector<HTMLButtonElement>('[data-role="revalidate-action"]');

  revalidateButton?.addEventListener('click', async () => {
    if (!selectedEnvironmentId || !window.svnflowDesktop?.revalidateEnvironment) {
      return;
    }

    setStatusMessage('Executando validação do ambiente...');
    const updated = await window.svnflowDesktop.revalidateEnvironment(selectedEnvironmentId);
    selectedEnvironmentId = updated.selectedEnvironmentId;
    renderEnvironmentStage(updated);
  });
}

function renderPreviewStage(preview: PreviewScreenState): void {
  const stageBody = document.querySelector<HTMLElement>('[data-role="stage-body"]');
  const environmentStatus = document.querySelector<HTMLElement>('[data-role="environment-status"]');
  const environmentGit = document.querySelector<HTMLElement>('[data-role="environment-git"]');
  const environmentSvn = document.querySelector<HTMLElement>('[data-role="environment-svn"]');
  const advanceGuard = document.querySelector<HTMLElement>('[data-role="advance-guard"]');

  setStatusMessage(preview.message);

  if (environmentStatus) {
    environmentStatus.textContent = preview.status === 'ready' ? 'Pronto' : 'Bloqueado';
  }

  if (environmentGit) {
    environmentGit.textContent = preview.environment?.gitWorkspacePath ?? 'Não disponível';
  }

  if (environmentSvn) {
    environmentSvn.textContent = preview.environment?.svnCheckoutPath ?? 'Não disponível';
  }

  if (advanceGuard) {
    advanceGuard.textContent = preview.canApplyInSvn
      ? 'Preview válido para próxima etapa'
      : 'Continuidade bloqueada até preview válido';
  }

  if (!stageBody) {
    return;
  }

  const blockers = preview.blockers
    .map((item) => `<li>${escapeHtml(item.message)}</li>`)
    .join('');
  const alerts = preview.alerts
    .map((item) => `<li>${escapeHtml(item.message)}</li>`)
    .join('');

  if (!preview.workspace || preview.workspace.files.length === 0) {
    stageBody.innerHTML = `
      <p class="empty-state">Nenhum arquivo afetado disponível para preview.</p>
      ${blockers ? `<ul class="preview-list">${blockers}</ul>` : ''}
      ${alerts ? `<ul class="preview-list">${alerts}</ul>` : ''}
    `;
    return;
  }

  const summary = `
    <div class="preview-summary">
      <p class="context-line">Branch: <strong>${escapeHtml(preview.workspace.branch ?? 'não identificado')}</strong></p>
      <p class="context-line">Base: <strong>${escapeHtml(preview.workspace.baseBranch)}</strong></p>
      <p class="context-line">Arquivos afetados: <strong>${preview.workspace.totalAffectedFiles}</strong></p>
    </div>
  `;

  const files = preview.workspace.files
    .map((file) => `
      <li class="preview-row">
        <span class="status-badge" data-kind="${preview.status === 'ready' ? 'ready' : 'attention'}">${escapeHtml(file.status)}</span>
        <span>${escapeHtml(file.path)}</span>
      </li>
    `)
    .join('');

  stageBody.innerHTML = `
    ${summary}
    <ul class="preview-files">${files}</ul>
    ${blockers ? `<p class="card-label">Bloqueios</p><ul class="preview-list">${blockers}</ul>` : ''}
    ${alerts ? `<p class="card-label">Alertas</p><ul class="preview-list">${alerts}</ul>` : ''}
  `;
}

async function updateMainContent(stage: StageDefinition): Promise<void> {
  const stageTitle = document.querySelector<HTMLElement>('[data-role="stage-title"]');
  const stageDescription = document.querySelector<HTMLElement>('[data-role="stage-description"]');
  const stageBody = document.querySelector<HTMLElement>('[data-role="stage-body"]');

  if (stageTitle) {
    stageTitle.textContent = stage.label;
  }

  if (stageDescription) {
    stageDescription.textContent = stage.description;
  }

  if (!stageBody) {
    return;
  }

  if (stage.key === 'environment') {
    if (!window.svnflowDesktop?.getEnvironmentScreenState) {
      renderEmptyEnvironmentState('Integração de ambiente indisponível no preload.');
      setStatusMessage('Falha ao carregar integração de ambiente.');
      return;
    }

    setStatusMessage('Carregando dados de ambiente...');
    const screen = await window.svnflowDesktop.getEnvironmentScreenState(selectedEnvironmentId);
    selectedEnvironmentId = screen.selectedEnvironmentId;
    renderEnvironmentStage(screen);
    return;
  }

  if (stage.key === 'preview') {
    if (!window.svnflowDesktop?.getPreviewScreenState) {
      stageBody.innerHTML = '<p class="empty-state">Integração de preview indisponível no preload.</p>';
      setStatusMessage('Falha ao carregar integração de preview.');
      return;
    }

    setStatusMessage('Carregando dados de preview...');
    const preview = await window.svnflowDesktop.getPreviewScreenState(selectedEnvironmentId);
    renderPreviewStage(preview);
    return;
  }

  stageBody.innerHTML = `<p class="empty-state">${stage.helper}</p>`;
  setStatusMessage(stage.helper);
}

function renderNavigation(): void {
  const stageList = document.querySelector<HTMLElement>('[data-role="stage-list"]');

  if (!stageList) {
    return;
  }

  stageList.innerHTML = '';

  for (const stage of STAGES) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stage-button';

    const state = stage.key === activeStage ? 'active' : stage.mode;
    button.dataset.state = state;
    button.disabled = stage.mode === 'blocked';

    button.innerHTML = `${stage.label}<small>${stage.helper}</small>`;

    button.addEventListener('click', async () => {
      activeStage = stage.key;
      renderNavigation();
      await updateMainContent(stage);
    });

    li.appendChild(button);
    stageList.appendChild(li);
  }
}

async function renderAppBootstrap(): Promise<void> {
  const appName = window.svnflowDesktop?.appName ?? 'SVNFlow';
  const title = document.querySelector<HTMLElement>('[data-role="app-title"]');
  const subtitle = document.querySelector<HTMLElement>('[data-role="app-subtitle"]');
  const environmentStatus = document.querySelector<HTMLElement>('[data-role="environment-status"]');
  const environmentGit = document.querySelector<HTMLElement>('[data-role="environment-git"]');
  const environmentSvn = document.querySelector<HTMLElement>('[data-role="environment-svn"]');

  if (title) {
    title.textContent = appName;
  }

  if (subtitle) {
    subtitle.textContent = 'Shell inicial navegável da V1';
  }

  if (environmentStatus) {
    environmentStatus.textContent = 'Não configurado';
  }

  if (environmentGit) {
    environmentGit.textContent = 'Aguardando seleção de ambiente';
  }

  if (environmentSvn) {
    environmentSvn.textContent = 'Aguardando seleção de ambiente';
  }

  renderNavigation();

  const selectedStage = STAGES.find((item) => item.key === activeStage) ?? STAGES[0];
  await updateMainContent(selectedStage);
}

window.addEventListener('DOMContentLoaded', () => {
  void renderAppBootstrap();
});

export {};
