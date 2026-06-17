declare global {
  interface Window {
    svnflowDesktop?: {
      appName: string;
      shellStatus: string;
      getEnvironmentScreenState?: (environmentId?: string) => Promise<EnvironmentScreenState>;
      revalidateEnvironment?: (environmentId?: string) => Promise<EnvironmentScreenState>;
      getPreviewScreenState?: (environmentId?: string) => Promise<PreviewScreenState>;
      getWorkspaceScreenState?: (environmentId?: string) => Promise<WorkspaceScreenState>;
      getCommitScreenState?: (environmentId?: string) => Promise<CommitScreenState>;
      executeCommit?: (environmentId: string, title: string, description?: string) => Promise<ExecuteCommitResult>;
      exportPackageFromPreview?: (environmentId?: string) => Promise<ExportPackageResult>;
      importAndValidatePackage?: (packagePath: string) => Promise<ImportPackageResult>;
      readPackageHistory?: () => Promise<PackageHistoryResult>;
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
  canExportPackage: boolean;
  canApplyInSvn: boolean;
}

interface WorkspaceScreenState {
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
    totals: {
      added: number;
      modified: number;
      deleted: number;
      renamed: number;
      copied: number;
      unknown: number;
    };
  };
  blockers: Array<{ code: string; message: string; affectedFiles?: string[] }>;
  alerts: Array<{ code: string; message: string; severity: 'info' | 'warning'; affectedFiles?: string[] }>;
  hasChanges: boolean;
  canAdvanceToPreview: boolean;
}

interface ExportPackageResult {
  ok: boolean;
  message: string;
  packagePath?: string;
  manifest?: {
    formatVersion: '1.0.0';
    packageId: string;
    generatedAt: string;
    checksumAlgorithm: 'sha256';
    checksum: string;
  };
  errorCode?: 'INVALID_PREVIEW' | 'WRITE_FAILED';
}

type ImportPackageErrorCategory = 'io' | 'schema' | 'integrity' | 'artifact';

interface ImportPackageValidationError {
  code: string;
  category: ImportPackageErrorCategory;
  message: string;
  path?: string;
}

interface ImportPackageResult {
  ok: boolean;
  status: 'valid' | 'invalid';
  message: string;
  packagePath: string;
  manifest?: {
    formatVersion: '1.0.0';
    packageId: string;
    generatedAt: string;
    checksumAlgorithm: 'sha256';
    checksum: string;
  };
  summary?: {
    packageId: string;
    generatedAt: string;
    environmentName: string;
    baseBranch: string;
    totalAffectedFiles: number;
  };
  review?: {
    title: string;
    environmentName: string;
    branch: string;
    baseBranch: string;
    totalAffectedFiles: number;
    generatedAt: string;
    whatChanged: string[];
    notes: string;
    markdown: string;
  };
  errors: ImportPackageValidationError[];
}

interface CommitScreenState {
  status: 'ready' | 'blocked';
  title: string;
  message: string;
  environment?: {
    environmentName: string;
    svnCheckoutPath: string;
  };
  commitValidation?: {
    hasChanges: boolean;
    affectedFilesCount: number;
    blockers: Array<{ code: string; message: string }>;
    canCommit: boolean;
  };
  canExecuteCommit: boolean;
}

interface ExecuteCommitResult {
  status: 'success' | 'failed' | 'cancelled' | 'conflict';
  message: string;
  revision?: string;
  filesCommitted?: number;
  conflicts?: Array<{ file: string; reason: string }>;
  errorCode?: string;
  error?: string;
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
    mode: 'available',
    description: 'Inspeção do workspace Git com branch, base, arquivos alterados e sinais de bloqueio.',
    helper: 'Revise o estado do Git antes de seguir para o preview.'
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
    mode: 'available',
    description: 'Commit protegido permanece indisponível até confirmação da aplicação no checkout SVN.',
    helper: 'Validações e execução protegida de commit SVN.'
  },
  {
    key: 'packages',
    label: 'Pacotes',
    mode: 'available',
    description: 'Importação e validação de pacote .svnflow com erros por categoria.',
    helper: 'Validação do contrato de pacote e checksum.'
  },
  {
    key: 'history',
    label: 'Histórico',
    mode: 'available',
    description: 'Histórico local de exportações e importações de pacotes .svnflow.',
    helper: 'Eventos de pacote registrados localmente.'
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
    <div class="stage-actions">
      <button class="action-button" data-role="export-package-action" ${preview.canExportPackage ? '' : 'disabled'}>
        Exportar pacote .svnflow
      </button>
    </div>
  `;

  const exportButton = stageBody.querySelector<HTMLButtonElement>('[data-role="export-package-action"]');

  exportButton?.addEventListener('click', async () => {
    if (!window.svnflowDesktop?.exportPackageFromPreview) {
      setStatusMessage('Integração de exportação de pacote indisponível.');
      return;
    }

    setStatusMessage('Exportando pacote .svnflow...');
    exportButton.disabled = true;

    const result = await window.svnflowDesktop.exportPackageFromPreview(selectedEnvironmentId);

    if (result.ok) {
      setStatusMessage(`Pacote exportado com sucesso em: ${result.packagePath}`);
      alert(`Pacote .svnflow exportado!\n\nArquivo: ${result.packagePath}\nChecksum: ${result.manifest?.checksum}`);
    } else {
      setStatusMessage(`Falha ao exportar pacote: ${result.message}`);
      alert(`Falha ao exportar pacote .svnflow:\n\n${result.message}`);
      exportButton.disabled = false;
    }
  });
}

function renderWorkspaceStage(workspaceState: WorkspaceScreenState): void {
  const stageBody = document.querySelector<HTMLElement>('[data-role="stage-body"]');
  const environmentStatus = document.querySelector<HTMLElement>('[data-role="environment-status"]');
  const environmentGit = document.querySelector<HTMLElement>('[data-role="environment-git"]');
  const environmentSvn = document.querySelector<HTMLElement>('[data-role="environment-svn"]');
  const advanceGuard = document.querySelector<HTMLElement>('[data-role="advance-guard"]');

  setStatusMessage(workspaceState.message);

  if (environmentStatus) {
    environmentStatus.textContent = workspaceState.status === 'ready' ? 'Pronto' : 'Bloqueado';
  }

  if (environmentGit) {
    environmentGit.textContent = workspaceState.environment?.gitWorkspacePath ?? 'Não disponível';
  }

  if (environmentSvn) {
    environmentSvn.textContent = workspaceState.environment?.svnCheckoutPath ?? 'Não disponível';
  }

  if (advanceGuard) {
    advanceGuard.textContent = workspaceState.canAdvanceToPreview
      ? 'Workspace Git pronto para seguir ao preview.'
      : 'Revise bloqueios ou ausência de alterações antes de seguir.';
  }

  if (!stageBody) {
    return;
  }

  const blockers = workspaceState.blockers
    .map((item) => `<li>${escapeHtml(item.message)}</li>`)
    .join('');
  const alerts = workspaceState.alerts
    .map((item) => `<li>${escapeHtml(item.message)}</li>`)
    .join('');

  if (!workspaceState.workspace) {
    stageBody.innerHTML = `
      <p class="empty-state">Nenhum workspace Git disponível para inspeção.</p>
      ${blockers ? `<ul class="preview-list">${blockers}</ul>` : ''}
    `;
    return;
  }

  const summary = `
    <div class="preview-summary">
      <p class="context-line">Branch atual: <strong>${escapeHtml(workspaceState.workspace.branch ?? 'não identificado')}</strong></p>
      <p class="context-line">Base de comparação: <strong>${escapeHtml(workspaceState.workspace.baseBranch)}</strong></p>
      <p class="context-line">Situação do repositório: <strong>${workspaceState.hasChanges ? 'Com alterações detectadas' : 'Sem alterações detectadas'}</strong></p>
      <p class="context-line">Arquivos afetados: <strong>${workspaceState.workspace.totalAffectedFiles}</strong></p>
      <p class="context-line">Resumo: <strong>${workspaceState.workspace.totals.added}</strong> criados, <strong>${workspaceState.workspace.totals.modified}</strong> modificados, <strong>${workspaceState.workspace.totals.deleted}</strong> removidos</p>
    </div>
  `;

  const files = workspaceState.workspace.files
    .map((file) => `
      <li class="preview-row">
        <span class="status-badge" data-kind="${workspaceState.status === 'ready' ? 'ready' : 'attention'}">${escapeHtml(file.status)}</span>
        <span title="${escapeHtml(file.description)}">${escapeHtml(file.path)}</span>
      </li>
    `)
    .join('');

  stageBody.innerHTML = `
    ${summary}
    ${files ? `<ul class="preview-files">${files}</ul>` : '<p class="empty-state">Nenhum arquivo alterado foi detectado.</p>'}
    ${blockers ? `<p class="card-label">Bloqueios</p><ul class="preview-list">${blockers}</ul>` : ''}
    ${alerts ? `<p class="card-label">Alertas</p><ul class="preview-list">${alerts}</ul>` : ''}
  `;
}

function renderCommitStage(commit: CommitScreenState): void {
  const stageBody = document.querySelector<HTMLElement>('[data-role="stage-body"]');
  const environmentStatus = document.querySelector<HTMLElement>('[data-role="environment-status"]');
  const advanceGuard = document.querySelector<HTMLElement>('[data-role="advance-guard"]');

  setStatusMessage(commit.message);

  if (environmentStatus) {
    environmentStatus.textContent = commit.status === 'ready' ? 'Pronto' : 'Bloqueado';
  }

  if (advanceGuard) {
    advanceGuard.textContent = commit.canExecuteCommit
      ? 'Commit validado e pronto para execução'
      : 'Commit bloqueado por validações pendentes';
  }

  if (!stageBody) {
    return;
  }

  const blockers = commit.commitValidation?.blockers
    ?.map((item) => `<li>${escapeHtml(item.message)}</li>`)
    .join('') ?? '';

  if (commit.status === 'blocked' || !commit.canExecuteCommit) {
    stageBody.innerHTML = `
      <p class="empty-state">${commit.message}</p>
      ${blockers ? `<p class="card-label">Bloqueios</p><ul class="preview-list">${blockers}</ul>` : ''}
    `;
    return;
  }

  const affectedFilesInfo = commit.commitValidation
    ? `<p class="context-line">Arquivos afetados: <strong>${commit.commitValidation.affectedFilesCount}</strong></p>`
    : '';

  stageBody.innerHTML = `
    <div class="commit-form">
      <p class="card-label">Mensagem de Commit SVN Protegido</p>
      <textarea id="commit-title" class="form-input" placeholder="Título descritivo (mínimo 10 caracteres)" maxlength="72" rows="2"></textarea>
      <div id="title-feedback" class="feedback"></div>
      <textarea id="commit-description" class="form-input" placeholder="Descrição opcional (até 500 caracteres)" maxlength="500" rows="4"></textarea>
      <div id="description-feedback" class="feedback"></div>
      <div class="commit-context">
        ${affectedFilesInfo}
      </div>
      ${blockers ? `<p class="card-label">Validação</p><ul class="preview-list">${blockers}</ul>` : ''}
      <button id="execute-commit" class="action-button" disabled>Executar Commit SVN</button>
    </div>
  `;

  const titleInput = stageBody.querySelector<HTMLTextAreaElement>('#commit-title');
  const descriptionInput = stageBody.querySelector<HTMLTextAreaElement>('#commit-description');
  const executeButton = stageBody.querySelector<HTMLButtonElement>('#execute-commit');

  if (titleInput) {
    titleInput.addEventListener('input', () => {
      const feedback = stageBody.querySelector<HTMLElement>('#title-feedback');
      if (feedback) {
        const titleLength = titleInput.value.length;
        if (titleLength < 10) {
          feedback.textContent = 'Título deve ter no mínimo 10 caracteres.';
          feedback.className = 'feedback invalid';
        } else if (!/^[A-Z]/.test(titleInput.value)) {
          feedback.textContent = 'Título deve começar com letra maiúscula.';
          feedback.className = 'feedback invalid';
        } else {
          feedback.textContent = 'Título válido para commit.';
          feedback.className = 'feedback valid';
        }
      }
      updateExecuteButtonState();
    });
  }

  if (descriptionInput) {
    descriptionInput.addEventListener('input', () => {
      const feedback = stageBody.querySelector<HTMLElement>('#description-feedback');
      if (feedback) {
        const desc = descriptionInput.value.trim();
        if (desc.length > 0 && desc.length < 20) {
          feedback.textContent = 'Descrição opcional: mínimo de 20 caracteres quando preenchida.';
          feedback.className = 'feedback invalid';
        } else {
          feedback.textContent = '';
          feedback.className = 'feedback';
        }
      }
      updateExecuteButtonState();
    });
  }

  function updateExecuteButtonState() {
    if (!executeButton) return;
    const title = titleInput?.value ?? '';
    const desc = descriptionInput?.value?.trim() ?? '';
    const titleValid = title.length >= 10 && /^[A-Z]/.test(title);
    const descriptionValid = desc.length === 0 || desc.length >= 20;
    executeButton.disabled = !titleValid || !descriptionValid || !commit.canExecuteCommit;
  }

  if (executeButton && commit.canExecuteCommit) {
    executeButton.addEventListener('click', async () => {
      const title = titleInput?.value?.trim() ?? '';
      const description = descriptionInput?.value?.trim() ?? '';

      if (title.length < 10) {
        alert('Título deve ter no mínimo 10 caracteres');
        return;
      }

      if (!/^[A-Z]/.test(title)) {
        alert('Título deve começar com letra maiúscula');
        return;
      }

      setStatusMessage('Executando commit SVN...');
      executeButton.disabled = true;
      executeButton.textContent = 'Processando...';

      if (!window.svnflowDesktop?.executeCommit || !selectedEnvironmentId) {
        alert('Integração de execução indisponível ou ambiente não selecionado.');
        executeButton.disabled = false;
        executeButton.textContent = 'Executar Commit SVN';
        setStatusMessage('Falha ao executar commit.');
        return;
      }

      const result = await window.svnflowDesktop.executeCommit(selectedEnvironmentId, title, description);

      if (result.status === 'success') {
        setStatusMessage(`Commit executado com sucesso (revisão ${result.revision}). ${result.filesCommitted} arquivo(s) commitado(s).`);
        if (titleInput) titleInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        executeButton.textContent = 'Executar Commit SVN';
        setTimeout(() => {
          alert(`Commit SVN executado com sucesso!\n\nRevisão: ${result.revision}\nArquivos: ${result.filesCommitted}\n\nMensagem: ${result.message}`);
        }, 500);
      } else if (result.status === 'cancelled') {
        setStatusMessage(result.message);
        executeButton.disabled = false;
        executeButton.textContent = 'Executar Commit SVN';
      } else if (result.status === 'conflict') {
        setStatusMessage(`Conflito durante commit: ${result.message}`);
        alert(`Conflito SVN: ${result.message}\n\nDetalhes: ${result.error}`);
        executeButton.disabled = false;
        executeButton.textContent = 'Executar Commit SVN';
      } else {
        setStatusMessage(`Erro ao executar commit: ${result.message}`);
        alert(`Erro ao executar commit SVN:\n\n${result.message}\n\nCódigo: ${result.errorCode}`);
        executeButton.disabled = false;
        executeButton.textContent = 'Executar Commit SVN';
      }
    });
  }
}

function renderPackagesStage(): void {
  const stageBody = document.querySelector<HTMLElement>('[data-role="stage-body"]');
  const advanceGuard = document.querySelector<HTMLElement>('[data-role="advance-guard"]');

  if (!stageBody) {
    return;
  }

  if (advanceGuard) {
    advanceGuard.textContent = 'Pacotes: validação por contrato e integridade.';
  }

  stageBody.innerHTML = `
    <div class="commit-form">
      <p class="card-label">Importar e validar pacote .svnflow</p>
      <input id="package-path" class="form-input" type="text" placeholder="/caminho/completo/arquivo.svnflow" />
      <div id="package-feedback" class="feedback"></div>
      <div class="stage-actions">
        <button id="validate-package" class="action-button">Validar pacote</button>
      </div>
      <div id="package-result" class="commit-context"></div>
    </div>
  `;

  const pathInput = stageBody.querySelector<HTMLInputElement>('#package-path');
  const validateButton = stageBody.querySelector<HTMLButtonElement>('#validate-package');
  const feedback = stageBody.querySelector<HTMLElement>('#package-feedback');
  const resultContainer = stageBody.querySelector<HTMLElement>('#package-result');

  validateButton?.addEventListener('click', async () => {
    const packagePath = pathInput?.value?.trim() ?? '';

    if (!packagePath) {
      if (feedback) {
        feedback.textContent = 'Informe o caminho completo do pacote .svnflow.';
        feedback.className = 'feedback invalid';
      }
      return;
    }

    if (!window.svnflowDesktop?.importAndValidatePackage) {
      setStatusMessage('Integração de importação de pacote indisponível.');
      return;
    }

    setStatusMessage('Importando e validando pacote .svnflow...');
    validateButton.disabled = true;

    const result = await window.svnflowDesktop.importAndValidatePackage(packagePath);

    if (!resultContainer) {
      return;
    }

    if (result.ok) {
      if (feedback) {
        feedback.textContent = 'Pacote válido.';
        feedback.className = 'feedback valid';
      }

      const review = result.review;
      const reviewWhatChanged = review?.whatChanged ?? [];
      const reviewRows = reviewWhatChanged
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('');

      const reviewCard = review
        ? `
          <p class="card-label">Revisão do pr.md</p>
          <p class="context-line"><strong>Título:</strong> ${escapeHtml(review.title)}</p>
          <p class="context-line"><strong>Ambiente:</strong> ${escapeHtml(review.environmentName)}</p>
          <p class="context-line"><strong>Branch:</strong> ${escapeHtml(review.branch)}</p>
          <p class="context-line"><strong>Base:</strong> ${escapeHtml(review.baseBranch)}</p>
          <p class="context-line"><strong>Arquivos afetados:</strong> ${review.totalAffectedFiles}</p>
          <p class="context-line"><strong>Gerado em:</strong> ${escapeHtml(review.generatedAt)}</p>
          <p class="context-line"><strong>Notas:</strong> ${escapeHtml(review.notes)}</p>
          <p class="card-label">O que mudou</p>
          ${reviewRows ? `<ul class="preview-list">${reviewRows}</ul>` : '<p class="empty-state">Sem itens listados.</p>'}
          <p class="card-label">Markdown original</p>
          <pre class="review-markdown">${escapeHtml(review.markdown)}</pre>
        `
        : '<p class="empty-state">Revisão indisponível para este pacote.</p>';

      resultContainer.innerHTML = `
        <p class="context-line"><strong>Status:</strong> válido</p>
        <p class="context-line"><strong>Package ID:</strong> ${escapeHtml(result.summary?.packageId ?? '-')}</p>
        <p class="context-line"><strong>Ambiente:</strong> ${escapeHtml(result.summary?.environmentName ?? '-')}</p>
        <p class="context-line"><strong>Base:</strong> ${escapeHtml(result.summary?.baseBranch ?? '-')}</p>
        <p class="context-line"><strong>Arquivos:</strong> ${result.summary?.totalAffectedFiles ?? 0}</p>
        <p class="context-line"><strong>Checksum:</strong> ${escapeHtml(result.manifest?.checksum ?? '-')}</p>
        ${reviewCard}
      `;
      setStatusMessage('Pacote .svnflow validado com sucesso.');
    } else {
      if (feedback) {
        feedback.textContent = 'Pacote inválido. Verifique os erros abaixo.';
        feedback.className = 'feedback invalid';
      }

      const errors = result.errors
        .map((error) => `<li>[${escapeHtml(error.category)}:${escapeHtml(error.code)}] ${escapeHtml(error.message)}</li>`)
        .join('');

      resultContainer.innerHTML = `
        <p class="context-line"><strong>Status:</strong> inválido</p>
        <p class="context-line"><strong>Mensagem:</strong> ${escapeHtml(result.message)}</p>
        <p class="card-label">Erros</p>
        <ul class="preview-list">${errors}</ul>
      `;
      setStatusMessage('Falha na validação do pacote .svnflow.');
    }

    validateButton.disabled = false;
  });
}

type PackageHistoryEventKind = 'exported' | 'imported' | 'invalid';

interface PackageHistoryEntry {
  id: string;
  kind: PackageHistoryEventKind;
  packageId: string;
  packagePath: string;
  environmentName: string;
  baseBranch: string;
  totalAffectedFiles: number;
  generatedAt: string;
  recordedAt: string;
}

interface PackageHistoryResult {
  ok: boolean;
  entries: PackageHistoryEntry[];
  storagePath: string;
  message: string;
}

async function renderHistoryStage(): Promise<void> {
  const stageBody = document.querySelector<HTMLElement>('[data-role="stage-body"]');

  if (!stageBody) {
    return;
  }

  stageBody.innerHTML = '<p class="empty-state">Carregando histórico...</p>';
  setStatusMessage('Carregando histórico de pacotes...');

  if (!window.svnflowDesktop?.readPackageHistory) {
    stageBody.innerHTML = '<p class="empty-state">Integração de histórico indisponível no preload.</p>';
    setStatusMessage('Falha ao carregar integração de histórico.');
    return;
  }

  const result: PackageHistoryResult = await window.svnflowDesktop.readPackageHistory();

  if (!result.ok || result.entries.length === 0) {
    stageBody.innerHTML = `
      <div class="card-group">
        <p class="empty-state">Nenhum evento registrado ainda.</p>
        <small>O histórico será preenchido após exportar ou importar pacotes.</small>
      </div>
    `;
    setStatusMessage('Histórico de pacotes vazio.');
    return;
  }

  const kindLabel: Record<PackageHistoryEventKind, string> = {
    exported: 'Exportado',
    imported: 'Importado',
    invalid: 'Inválido'
  };

  const rows = result.entries.map(entry => `
    <tr>
      <td>${kindLabel[entry.kind] ?? entry.kind}</td>
      <td>${escapeHtml(entry.environmentName)}</td>
      <td>${escapeHtml(entry.baseBranch)}</td>
      <td>${entry.totalAffectedFiles}</td>
      <td title="${escapeHtml(entry.packagePath)}">${escapeHtml(entry.packageId)}</td>
      <td>${escapeHtml(new Date(entry.recordedAt).toLocaleString('pt-BR'))}</td>
    </tr>
  `).join('');

  stageBody.innerHTML = `
    <div class="card-group">
      <p class="card-label">${result.entries.length} registro(s)</p>
      <table class="history-table">
        <thead>
          <tr>
            <th>Ação</th>
            <th>Ambiente</th>
            <th>Branch base</th>
            <th>Arquivos</th>
            <th>Pacote ID</th>
            <th>Registrado em</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  setStatusMessage(`${result.entries.length} evento(s) no histórico de pacotes.`);
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

  if (stage.key === 'workspace') {
    if (!window.svnflowDesktop?.getWorkspaceScreenState) {
      stageBody.innerHTML = '<p class="empty-state">Integração de workspace Git indisponível no preload.</p>';
      setStatusMessage('Falha ao carregar integração de workspace Git.');
      return;
    }

    setStatusMessage('Carregando estado do workspace Git...');
    const workspace = await window.svnflowDesktop.getWorkspaceScreenState(selectedEnvironmentId);
    renderWorkspaceStage(workspace);
    return;
  }

  if (stage.key === 'commit') {
    if (!window.svnflowDesktop?.getCommitScreenState) {
      stageBody.innerHTML = '<p class="empty-state">Integração de commit indisponível no preload.</p>';
      setStatusMessage('Falha ao carregar integração de commit.');
      return;
    }

    setStatusMessage('Carregando dados de commit...');
    const commit = await window.svnflowDesktop.getCommitScreenState(selectedEnvironmentId);
    renderCommitStage(commit);
    return;
  }

  if (stage.key === 'packages') {
    renderPackagesStage();
    return;
  }

  if (stage.key === 'history') {
    await renderHistoryStage();
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
