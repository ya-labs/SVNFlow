import { getYaLabsVisualProfile } from './ya-labs-visual.js';

export type V1StageKey = 'environment' | 'preview' | 'apply' | 'commit' | 'packages';

export interface ShellVisualNavItem {
  key: V1StageKey;
  label: string;
  enabled: boolean;
}

export interface ShellVisualRegions {
  header: {
    appName: string;
    subtitle: string;
  };
  sidebar: {
    title: string;
    navigation: ShellVisualNavItem[];
  };
  main: {
    title: string;
    description: string;
    sections: string[];
  };
  statusBar: {
    message: string;
  };
}

export interface ShellVisualState {
  status: 'ready';
  designSystemReference: 'YA_LABS';
  visualProfile: ReturnType<typeof getYaLabsVisualProfile>;
  activeStage: V1StageKey;
  currentAreaLabel: string;
  regions: ShellVisualRegions;
  executesSensitiveOperations: false;
}

export interface BuildShellVisualStateInput {
  activeStage?: V1StageKey;
}

const V1_NAV_ORDER: Array<{ key: V1StageKey; label: string }> = [
  { key: 'environment', label: 'Ambiente' },
  { key: 'preview', label: 'Preview' },
  { key: 'apply', label: 'Aplicação SVN' },
  { key: 'commit', label: 'Commit SVN' },
  { key: 'packages', label: 'Pacotes SVNFlow' }
];

function buildNavigation(activeStage: V1StageKey): ShellVisualNavItem[] {
  const activeIndex = V1_NAV_ORDER.findIndex((item) => item.key === activeStage);

  return V1_NAV_ORDER.map((item, index) => ({
    key: item.key,
    label: item.label,
    enabled: index <= activeIndex
  }));
}

function getAreaLabel(stage: V1StageKey): string {
  return V1_NAV_ORDER.find((item) => item.key === stage)?.label ?? 'Ambiente';
}

export function buildShellVisualState(input?: BuildShellVisualStateInput): ShellVisualState {
  const activeStage = input?.activeStage ?? 'environment';
  const currentAreaLabel = getAreaLabel(activeStage);

  return {
    status: 'ready',
    designSystemReference: 'YA_LABS',
    visualProfile: getYaLabsVisualProfile(),
    activeStage,
    currentAreaLabel,
    regions: {
      header: {
        appName: 'SVNFlow',
        subtitle: 'Fluxo assistido Git para publicação segura em SVN'
      },
      sidebar: {
        title: 'Etapas da V1',
        navigation: buildNavigation(activeStage)
      },
      main: {
        title: `Área principal: ${currentAreaLabel}`,
        description: 'Estrutura inicial para acoplar estados de ambiente, preview, aplicação, commit e pacotes.',
        sections: [
          'Ambiente ativo',
          'Etapa atual',
          'Mensagens de validação',
          'Resumo operacional'
        ]
      },
      statusBar: {
        message: 'Shell visual inicial pronto. Nenhuma operação sensível é executada automaticamente.'
      }
    },
    executesSensitiveOperations: false
  };
}
