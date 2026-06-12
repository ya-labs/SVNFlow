declare global {
  interface Window {
    svnflowDesktop?: {
      appName: string;
      shellStatus: string;
    };
  }
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
    mode: 'blocked',
    description: 'Preview bloqueado até o ambiente e o workspace estarem aptos para validação real.',
    helper: 'Bloqueado por pré-condições de fluxo V1.'
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

function updateMainContent(stage: StageDefinition): void {
  const stageTitle = document.querySelector<HTMLElement>('[data-role="stage-title"]');
  const stageDescription = document.querySelector<HTMLElement>('[data-role="stage-description"]');
  const status = document.querySelector<HTMLElement>('[data-role="app-status"]');

  if (stageTitle) {
    stageTitle.textContent = stage.label;
  }

  if (stageDescription) {
    stageDescription.textContent = stage.description;
  }

  if (!status) {
    return;
  }

  if (stage.mode === 'blocked') {
    status.textContent = stage.helper;
    return;
  }

  status.textContent = stage.helper;
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

    button.addEventListener('click', () => {
      activeStage = stage.key;
      renderNavigation();
      updateMainContent(stage);
    });

    li.appendChild(button);
    stageList.appendChild(li);
  }
}

function renderAppBootstrap(): void {
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
  updateMainContent(selectedStage);
}

window.addEventListener('DOMContentLoaded', renderAppBootstrap);

export {};
