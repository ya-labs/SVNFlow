import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  readSavedEnvironments,
  updateSavedEnvironment,
  resolveSavedEnvironmentStoragePath
} from './commands/saved-environment-store.js';
import {
  listSavedEnvironments,
  selectSavedEnvironment,
  type SelectedEnvironment,
  type SavedEnvironmentListItem,
  type SavedEnvironmentValidationStatus
} from './commands/saved-environments.js';
import { revalidateEnvironment } from './commands/revalidate-environment.js';
import { buildPreviewScreenState } from './commands/preview-screen.js';
import { validateCommitPreConditions, type ValidateCommitResult } from './commands/commit-validator.js';
import { executeCommit, type ExecuteCommitResult } from './commands/commit-executor.js';
import { exportSvnflowPackage, type ExportPackageResult } from './commands/package-exporter.js';
import { importAndValidateSvnflowPackage, type ImportPackageResult } from './commands/package-importer.js';
import { appendPackageHistory, readPackageHistory, type PackageHistoryResult } from './commands/package-history.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type EnvironmentVisualStatus = 'ready' | 'attention' | 'blocked' | 'error' | 'pending';

interface EnvironmentListEntry {
  id: string;
  name: string;
  lastValidationStatus: SavedEnvironmentValidationStatus;
  needsRevalidation: boolean;
  visualStatus: EnvironmentVisualStatus;
}

interface EnvironmentScreenState {
  message: string;
  storagePath: string;
  items: EnvironmentListEntry[];
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

async function resolveSelectedEnvironmentById(environmentId?: string): Promise<SelectedEnvironment | undefined> {
  const storagePath = resolveSavedEnvironmentStoragePath();
  const storage = await readSavedEnvironments({ storagePath });

  if (!storage.ok || storage.environments.length === 0) {
    return undefined;
  }

  const resolvedId = environmentId ?? storage.environments[0].id;
  const selectedResult = selectSavedEnvironment({
    environments: storage.environments,
    environmentId: resolvedId
  });

  return selectedResult.selectedEnvironment;
}

async function buildPreviewRendererState(environmentId?: string): Promise<PreviewScreenState> {
  const selectedEnvironment = await resolveSelectedEnvironmentById(environmentId);
  const preview = buildPreviewScreenState({
    selectedEnvironment
  });

  return {
    status: preview.status,
    title: preview.title,
    message: preview.message,
    environment: preview.environment,
    workspace: preview.workspace,
    blockers: preview.blockers,
    alerts: preview.alerts,
    canExportPackage: preview.actions.canExportPackage.canAdvance,
    canApplyInSvn: preview.actions.canApplyInSvn.canAdvance
  };
}

async function buildCommitScreenState(selectedEnvironmentId?: string): Promise<CommitScreenState> {
  const selected = await resolveSelectedEnvironmentById(selectedEnvironmentId);

  if (!selected) {
    return {
      status: 'blocked',
      title: 'Commit SVN Protegido',
      message: 'Nenhum ambiente selecionado. Selecione um ambiente para iniciar.',
      canExecuteCommit: false
    };
  }

  const validationResult = validateCommitPreConditions({
    checkoutPath: selected.svnCheckoutPath
  });

  const canExecuteCommit = validationResult.status === 'ready' && validationResult.canCommit;

  return {
    status: validationResult.status === 'ready' ? 'ready' : 'blocked',
    title: 'Commit SVN Protegido',
    message: validationResult.message,
    environment: {
      environmentName: selected.name,
      svnCheckoutPath: selected.svnCheckoutPath
    },
    commitValidation: {
      hasChanges: validationResult.hasChanges,
      affectedFilesCount: validationResult.affectedFilesCount,
      blockers: validationResult.blockers,
      canCommit: validationResult.canCommit
    },
    canExecuteCommit
  };
}

function mapVisualStatus(item: SavedEnvironmentListItem): EnvironmentVisualStatus {
  if (item.lastValidationStatus === 'error') {
    return 'error';
  }

  if (item.lastValidationStatus === 'blocked') {
    return 'blocked';
  }

  if (item.lastValidationStatus === 'pending') {
    return 'pending';
  }

  if (item.needsRevalidation) {
    return 'attention';
  }

  return 'ready';
}

function mapListEntry(item: SavedEnvironmentListItem): EnvironmentListEntry {
  return {
    id: item.id,
    name: item.name,
    lastValidationStatus: item.lastValidationStatus,
    needsRevalidation: item.needsRevalidation,
    visualStatus: mapVisualStatus(item)
  };
}

async function buildEnvironmentScreenState(
  selectedEnvironmentId?: string,
  messageOverride?: string
): Promise<EnvironmentScreenState> {
  const storagePath = resolveSavedEnvironmentStoragePath();
  const storage = await readSavedEnvironments({ storagePath });

  if (!storage.ok) {
    return {
      message: storage.message,
      storagePath,
      items: [],
      emptyState: true,
      canAdvanceToSensitiveOperations: false
    };
  }

  const list = listSavedEnvironments({ environments: storage.environments });

  if (list.items.length === 0) {
    return {
      message: messageOverride ?? list.message,
      storagePath,
      items: [],
      emptyState: true,
      canAdvanceToSensitiveOperations: false
    };
  }

  const resolvedSelectedId = selectedEnvironmentId ?? list.items[0].id;
  const selectedResult = selectSavedEnvironment({
    environments: storage.environments,
    environmentId: resolvedSelectedId
  });
  const selectedItem = list.items.find((item) => item.id === selectedResult.selectedEnvironment?.id);

  return {
    message: messageOverride ?? selectedResult.message,
    storagePath,
    items: list.items.map(mapListEntry),
    selectedEnvironmentId: selectedResult.selectedEnvironment?.id,
    selected: selectedResult.selectedEnvironment && selectedItem
      ? {
          ...selectedResult.selectedEnvironment,
          visualStatus: mapVisualStatus(selectedItem)
        }
      : undefined,
    emptyState: false,
    canAdvanceToSensitiveOperations: selectedItem ? mapVisualStatus(selectedItem) === 'ready' : false
  };
}

function registerIpcHandlers(): void {
  ipcMain.handle('environment:get-screen-state', async (_event, payload?: { environmentId?: string }) =>
    buildEnvironmentScreenState(payload?.environmentId)
  );

  ipcMain.handle('environment:revalidate', async (_event, payload?: { environmentId?: string }) => {
    const screenState = await buildEnvironmentScreenState(payload?.environmentId);

    if (!screenState.selectedEnvironmentId) {
      return screenState;
    }

    const storage = await readSavedEnvironments({ storagePath: screenState.storagePath });

    if (!storage.ok) {
      return {
        ...screenState,
        message: storage.message
      };
    }

    const selected = storage.environments.find((item) => item.id === screenState.selectedEnvironmentId);

    if (!selected) {
      return {
        ...screenState,
        message: 'Ambiente selecionado não encontrado para revalidação.'
      };
    }

    const revalidation = revalidateEnvironment({ environment: selected });
    const now = new Date().toISOString();
    const nextStatus: Exclude<SavedEnvironmentValidationStatus, 'pending'> =
      revalidation.safeForSensitiveOperations
        ? 'ready'
        : revalidation.blockers.some((blocker) => blocker.code === 'VALIDATION_ERROR')
          ? 'error'
          : 'blocked';

    await updateSavedEnvironment({
      storagePath: screenState.storagePath,
      environmentId: selected.id,
      changes: {
        lastValidatedAt: now,
        lastValidationStatus: nextStatus
      }
    });

    return buildEnvironmentScreenState(selected.id, revalidation.message);
  });

  ipcMain.handle('preview:get-screen-state', async (_event, payload?: { environmentId?: string }) =>
    buildPreviewRendererState(payload?.environmentId)
  );

  ipcMain.handle('packages:export-from-preview', async (_event, payload?: { environmentId?: string }): Promise<ExportPackageResult> => {
    const preview = await buildPreviewRendererState(payload?.environmentId);

    if (!preview.environment || !preview.workspace) {
      return {
        ok: false,
        message: 'Preview indisponivel para exportacao de pacote.',
        errorCode: 'INVALID_PREVIEW'
      };
    }

    const exportResult = await exportSvnflowPackage({
      preview: {
        environment: preview.environment,
        workspace: preview.workspace,
        blockers: preview.blockers,
        alerts: preview.alerts
      }
    });

    if (exportResult.ok && exportResult.packagePath && exportResult.manifest) {
      await appendPackageHistory({
        entry: {
          kind: 'exported',
          packageId: exportResult.manifest.packageId,
          packagePath: exportResult.packagePath,
          environmentName: preview.environment.environmentName,
          baseBranch: preview.workspace.baseBranch,
          totalAffectedFiles: preview.workspace.totalAffectedFiles,
          generatedAt: exportResult.manifest.generatedAt
        }
      });
    }

    return exportResult;
  });

  ipcMain.handle('packages:import-and-validate', async (_event, payload?: { packagePath?: string }): Promise<ImportPackageResult> => {
    const result = await importAndValidateSvnflowPackage(payload?.packagePath ?? '');

    if (result.manifest && result.summary) {
      await appendPackageHistory({
        entry: {
          kind: result.ok ? 'imported' : 'invalid',
          packageId: result.manifest.packageId,
          packagePath: result.packagePath,
          environmentName: result.summary.environmentName,
          baseBranch: result.summary.baseBranch,
          totalAffectedFiles: result.summary.totalAffectedFiles,
          generatedAt: result.manifest.generatedAt
        }
      });
    }

    return result;
  });

  ipcMain.handle('packages:read-history', async (): Promise<PackageHistoryResult> => {
    return readPackageHistory();
  });

  ipcMain.handle('commit:get-screen-state', async (_event, payload?: { environmentId?: string }) =>
    buildCommitScreenState(payload?.environmentId)
  );

  ipcMain.handle(
    'commit:execute',
    async (_event, payload?: { environmentId?: string; title: string; description?: string }): Promise<ExecuteCommitResult> => {
      const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

      if (!selected || !payload?.title) {
        return {
          status: 'failed',
          message: 'Ambiente ou mensagem de commit não fornecidos.',
          errorCode: 'INVALID_INPUT'
        };
      }

      return executeCommit({
        checkoutPath: selected.svnCheckoutPath,
        title: payload.title,
        description: payload.description
      });
    }
  );
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    title: 'SVNFlow',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const rendererEntry = path.join(__dirname, '..', 'renderer', 'index.html');
  window.loadFile(rendererEntry);

  return window;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
