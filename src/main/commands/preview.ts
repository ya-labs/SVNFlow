import { validateEnvironmentState, type EnvironmentStateResult, type EnvironmentStateStatus } from './environment';
import type { GitChangedFile, GitChangedFileStatus } from './workspace';
import type { SelectedEnvironment } from './saved-environments';

export type { SelectedEnvironment } from './saved-environments';

export interface PreviewEnvironmentContext extends SelectedEnvironment {
  svnCheckoutRoot?: string;
}

export interface ClassifiedGitChangedFile extends GitChangedFile {
  humanReadableStatus: string;
  description: string;
}

export interface PreviewBlocker {
  code: string;
  message: string;
  affectedFiles?: string[];
}

export interface PreviewAlert {
  code: string;
  message: string;
  severity: 'info' | 'warning';
  affectedFiles?: string[];
}

export interface PreviewWorkspaceContext {
  branch?: string;
  baseBranch: string;
  hasChanges: boolean;
  changedFilesCount: number;
  changedFiles: GitChangedFile[];
  classifiedFiles: ClassifiedGitChangedFile[];
}

export interface PreviewChangedFilesTotals {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  copied: number;
  unknown: number;
}

export interface PreviewSummary {
  branch?: string;
  baseBranch: string;
  activeEnvironment: {
    id: string;
    name: string;
  };
  totalAffectedFiles: number;
  totalsByChangeType: PreviewChangedFilesTotals;
  hasSufficientChanges: boolean;
}

export interface PreviewContextResult {
  status: EnvironmentStateStatus;
  canPreview: boolean;
  message: string;
  environment?: PreviewEnvironmentContext;
  workspace?: PreviewWorkspaceContext;
  summary?: PreviewSummary;
  blockers: (string | PreviewBlocker)[];
  alerts?: PreviewAlert[];
}

export interface PreviewContextInput {
  selectedEnvironment?: SelectedEnvironment;
  baseBranch?: string;
}

function createEnvironmentContext(
  selectedEnvironment: SelectedEnvironment,
  state?: EnvironmentStateResult
): PreviewEnvironmentContext {
  return {
    ...selectedEnvironment,
    svnCheckoutRoot: state?.svn.checkout.checkoutRoot
  };
}

function getHumanReadableStatus(status: GitChangedFileStatus): string {
  const statusMap: Record<GitChangedFileStatus, string> = {
    added: 'Criado',
    modified: 'Modificado',
    deleted: 'Removido',
    renamed: 'Renomeado',
    copied: 'Copiado',
    unknown: 'Desconhecido'
  };
  return statusMap[status];
}

function generateChangeDescription(file: GitChangedFile): string {
  const humanStatus = getHumanReadableStatus(file.status);

  if (file.status === 'renamed' && file.previousPath) {
    return `${humanStatus}: ${file.previousPath} → ${file.path}`;
  }

  if (file.status === 'copied' && file.previousPath) {
    return `${humanStatus}: ${file.previousPath} → ${file.path}`;
  }

  return `${humanStatus}: ${file.path}`;
}

function classifyChangedFiles(files: GitChangedFile[]): ClassifiedGitChangedFile[] {
  return files.map((file) => ({
    ...file,
    humanReadableStatus: getHumanReadableStatus(file.status),
    description: generateChangeDescription(file)
  }));
}

function getCommonBinaryExtensions(): Set<string> {
  return new Set([
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'ico', 'webp', 'tiff',
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z', 'gz', 'tar',
    // Audio/Video
    'mp3', 'wav', 'mp4', 'avi', 'mov', 'flv', 'mkv', 'webm',
    // Executables
    'exe', 'dll', 'so', 'dylib', 'class', 'jar', 'app', 'msi',
    // Archives
    'iso', 'dmg', 'bin', 'img',
    // Data
    'db', 'sqlite', 'parquet', 'avro', 'proto',
    // Fonts
    'ttf', 'otf', 'woff', 'woff2'
  ]);
}

function isPotentiallyBinary(filePath: string): boolean {
  const extension = filePath.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  return getCommonBinaryExtensions().has(extension);
}

function detectUnknownStatusFiles(files: GitChangedFile[]): string[] {
  return files
    .filter((file) => file.status === 'unknown')
    .map((file) => file.path);
}

function detectPotentialBinaryFiles(files: GitChangedFile[]): string[] {
  return files
    .filter((file) => isPotentiallyBinary(file.path))
    .map((file) => file.path);
}

function detectPreviewRisks(files: GitChangedFile[]): {
  unknownStatusFiles: string[];
  potentialBinaryFiles: string[];
} {
  return {
    unknownStatusFiles: detectUnknownStatusFiles(files),
    potentialBinaryFiles: detectPotentialBinaryFiles(files)
  };
}

function calculateChangedFilesTotals(changedFiles: GitChangedFile[]): PreviewChangedFilesTotals {
  return changedFiles.reduce<PreviewChangedFilesTotals>((totals, file) => {
    if (file.status === 'added') {
      totals.added += 1;
      return totals;
    }

    if (file.status === 'modified') {
      totals.modified += 1;
      return totals;
    }

    if (file.status === 'deleted') {
      totals.deleted += 1;
      return totals;
    }

    if (file.status === 'renamed') {
      totals.renamed += 1;
      return totals;
    }

    if (file.status === 'copied') {
      totals.copied += 1;
      return totals;
    }

    totals.unknown += 1;
    return totals;
  }, {
    added: 0,
    modified: 0,
    deleted: 0,
    renamed: 0,
    copied: 0,
    unknown: 0
  });
}

function createPreviewSummary(
  selectedEnvironment: SelectedEnvironment,
  workspace: PreviewWorkspaceContext
): PreviewSummary {
  return {
    branch: workspace.branch,
    baseBranch: workspace.baseBranch,
    activeEnvironment: {
      id: selectedEnvironment.id,
      name: selectedEnvironment.name
    },
    totalAffectedFiles: workspace.changedFilesCount,
    totalsByChangeType: calculateChangedFilesTotals(workspace.changedFiles),
    hasSufficientChanges: workspace.changedFilesCount > 0
  };
}

export function buildPreviewContext(input: PreviewContextInput): PreviewContextResult {
  if (!input.selectedEnvironment) {
    return {
      status: 'blocked',
      canPreview: false,
      message: 'Selecione um ambiente válido antes de gerar o preview.',
      blockers: ['NO_SELECTED_ENVIRONMENT']
    };
  }

  const state = validateEnvironmentState({
    gitRepositoryPath: input.selectedEnvironment.gitWorkspacePath,
    svnCheckoutPath: input.selectedEnvironment.svnCheckoutPath,
    baseBranch: input.baseBranch
  });

  const environment = createEnvironmentContext(input.selectedEnvironment, state);
  const workspace = {
    branch: state.git.workspace.branch,
    baseBranch: state.git.workspace.baseBranch,
    hasChanges: state.git.workspace.hasChanges,
    changedFilesCount: state.git.workspace.changedFiles.length,
    changedFiles: state.git.workspace.changedFiles,
    classifiedFiles: classifyChangedFiles(state.git.workspace.changedFiles)
  };
  const summary = createPreviewSummary(input.selectedEnvironment, workspace);
  const risks = detectPreviewRisks(state.git.workspace.changedFiles);

  if (state.status !== 'ready') {
    return {
      status: state.status,
      canPreview: false,
      message: state.message,
      environment,
      workspace,
      summary,
      blockers: [state.git.workspace.error, state.git.repository.error, state.svn.checkout.error]
        .filter((error): error is string => Boolean(error)),
      alerts: []
    };
  }

  if (!summary.hasSufficientChanges) {
    return {
      status: 'ready',
      canPreview: true,
      message: `Nenhuma alteração encontrada para o ambiente ${input.selectedEnvironment.name}.`,
      environment,
      workspace,
      summary,
      blockers: [{
        code: 'NO_CHANGES',
        message: 'Nenhuma alteração foi detectada. Revise o branch ou faça modificações antes de prosseguir.'
      }],
      alerts: []
    };
  }

  const alerts: PreviewAlert[] = [];

  if (risks.unknownStatusFiles.length > 0) {
    alerts.push({
      code: 'UNKNOWN_FILE_STATUS',
      message: `${risks.unknownStatusFiles.length} arquivo(s) com status desconhecido.`,
      severity: 'warning',
      affectedFiles: risks.unknownStatusFiles
    });
  }

  if (risks.potentialBinaryFiles.length > 0) {
    alerts.push({
      code: 'POTENTIAL_BINARY_FILES',
      message: `${risks.potentialBinaryFiles.length} arquivo(s) potencialmente binário(s) detectado(s). A aplicação pode ter limitações com conteúdo binário.`,
      severity: 'info',
      affectedFiles: risks.potentialBinaryFiles
    });
  }

  return {
    status: 'ready',
    canPreview: true,
    message: `Preview pronto para o ambiente ${input.selectedEnvironment.name}.`,
    environment,
    workspace,
    summary,
    blockers: [],
    alerts
  };
}
