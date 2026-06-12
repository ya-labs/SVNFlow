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
  type SavedEnvironmentListItem,
  type SavedEnvironmentValidationStatus
} from './commands/saved-environments.js';
import { revalidateEnvironment } from './commands/revalidate-environment.js';

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
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: 'SVNFlow',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
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
