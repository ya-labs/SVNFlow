import { spawn } from 'node:child_process';
import { app, BrowserWindow, dialog, ipcMain, nativeImage, nativeTheme, shell, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  EnvironmentListEntry,
  EnvironmentScreenState,
  EnvironmentVisualStatus,
  CheckoutRequest,
  CommitSelectedRequest,
  CheckoutResponse,
  LinkGitResponse,
  RepositoriesState,
  RegisterEnvironmentInput,
  RegisterEnvironmentResponse,
  SyncExecuteResponse,
  SyncScreenState
} from '../shared/ipc-types.js';
import { isAppTheme, isSvnUrl, readAppSettings, updateAppSettings, type AppTheme, type RepositoryRoot } from './commands/app-settings.js';
import { checkoutProject } from './commands/svn-checkout.js';
import { addToSvnIgnore, commitSelected, countIncoming, discardChanges, readWorkingCopyDiff, readWorkingCopyStatus, setIgnoreOnCommit, updateWorkingCopy, type DiscardResult, type SimpleResult, type CommitSelectedResult, type IncomingResult, type UpdateResult, type WorkingCopyStatus } from './commands/svn-working-copy.js';
import type { SvnCredentials } from './commands/svn-client.js';
import { listRemote, type RemoteListing } from './commands/svn-repository-browser.js';
import { listGitBranches, switchGitBranch, type GitBranchList, type SwitchGitBranchResult } from './commands/git-branches.js';
import { buildFileDiff, buildSyncPlan, executeSync, suggestSyncCommitMessage, type SyncFileDiff } from './commands/git-svn-sync.js';
import { readLog, readRevisionDiff, type SvnLogPage } from './commands/svn-history.js';
import { linkGitToSavedEnvironment, registerSavedEnvironmentFromLocalPaths } from './commands/register-saved-environment.js';
import {
  readSavedEnvironments,
  removeSavedEnvironment,
  resolveSavedEnvironmentStoragePath,
  updateSavedEnvironment
} from './commands/saved-environment-store.js';
import {
  listSavedEnvironments,
  selectSavedEnvironment,
  type SavedEnvironmentListItem,
  type SelectedEnvironment
} from './commands/saved-environments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BASE_BRANCH = 'main';
const GIT_NOT_LINKED_MESSAGE = 'Este projeto não tem repositório Git vinculado.';

type GitLinkedEnvironment = SelectedEnvironment & { gitWorkspacePath: string };

function hasGit(environment: SelectedEnvironment | undefined): environment is GitLinkedEnvironment {
  return Boolean(environment?.gitWorkspacePath);
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

async function buildSyncScreenState(environmentId?: string, messageOverride?: string): Promise<SyncScreenState> {
  const selected = await resolveSelectedEnvironmentById(environmentId);

  if (!selected) {
    return {
      message: 'Nenhum ambiente cadastrado. Cadastre o repositório Git e o checkout SVN na etapa Ambiente.',
      canCommit: false
    };
  }

  if (!hasGit(selected)) {
    return {
      message: `${GIT_NOT_LINKED_MESSAGE} A sincronização Git → SVN fica disponível ao vincular um Git.`,
      environment: {
        id: selected.id,
        name: selected.name,
        svnCheckoutPath: selected.svnCheckoutPath
      },
      canCommit: false
    };
  }

  const plan = buildSyncPlan({
    gitWorkspacePath: selected.gitWorkspacePath,
    svnCheckoutPath: selected.svnCheckoutPath,
    exclusions: selected.syncExclusions
  });
  const canCommit = plan.status === 'up-to-date' && plan.pendingSvnChanges > 0;

  return {
    message: messageOverride ?? plan.message,
    environment: {
      id: selected.id,
      name: selected.name,
      gitWorkspacePath: selected.gitWorkspacePath,
      svnCheckoutPath: selected.svnCheckoutPath
    },
    plan,
    lastSyncedCommit: selected.lastSyncedGitCommit,
    suggestedCommitMessage: plan.source
      ? suggestSyncCommitMessage({
          gitWorkspacePath: selected.gitWorkspacePath,
          commit: plan.source.commit,
          lastSyncedCommit: selected.lastSyncedGitCommit
        })
      : undefined,
    canCommit
  };
}

async function executeSyncForEnvironment(environmentId?: string): Promise<SyncExecuteResponse> {
  const selected = await resolveSelectedEnvironmentById(environmentId);

  if (!hasGit(selected)) {
    return { screen: await buildSyncScreenState(environmentId) };
  }

  const result = executeSync({
    gitWorkspacePath: selected.gitWorkspacePath,
    svnCheckoutPath: selected.svnCheckoutPath,
    exclusions: selected.syncExclusions,
    confirmed: true
  });

  return { result, screen: await buildSyncScreenState(selected.id, result.message) };
}

async function commitSelectedForEnvironment(request: CommitSelectedRequest): Promise<CommitSelectedResult> {
  const selected = await resolveSelectedEnvironmentById(request?.environmentId);
  const paths = Array.isArray(request?.paths) ? request.paths.filter((item): item is string => typeof item === 'string') : [];
  const message = typeof request?.message === 'string' ? request.message : '';

  if (!selected) {
    return { ok: false, message: 'Nenhum projeto selecionado.', committed: [], errorCode: 'INVALID_SELECTION' };
  }

  if (hasGit(selected) && request.allowGitDifferences !== true && (await buildSyncScreenState(selected.id)).plan?.status === 'ready') {
    return { ok: false, message: 'O checkout ainda não está igual ao Git. Copie os arquivos do Git antes de commitar.', committed: [], errorCode: 'INVALID_SELECTION' };
  }

  const result = await commitSelected({
    checkoutPath: selected.svnCheckoutPath,
    paths,
    message,
    credentials: sanitizeCredentials(request.credentials)
  });

  if (!result.ok) {
    return result;
  }

  if (hasGit(selected)) {
    const screen = await buildSyncScreenState(selected.id);
    const source = screen.plan?.source;

    // Só marca o commit Git como publicado quando o checkout ficou limpo.
    if (source && screen.plan?.status === 'up-to-date' && screen.plan.pendingSvnChanges === 0) {
      await updateSavedEnvironment({ environmentId: selected.id, changes: { lastSyncedGitCommit: source.commit } });
    }
  }

  return result;
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

  const knownSelectedId = list.items.some((item) => item.id === selectedEnvironmentId) ? selectedEnvironmentId : undefined;
  const resolvedSelectedId = knownSelectedId ?? list.items[0].id;
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
          id: selectedResult.selectedEnvironment.id,
          name: selectedResult.selectedEnvironment.name,
          gitWorkspacePath: selectedResult.selectedEnvironment.gitWorkspacePath,
          svnCheckoutPath: selectedResult.selectedEnvironment.svnCheckoutPath,
          baseBranch: selectedResult.selectedEnvironment.baseBranch ?? DEFAULT_BASE_BRANCH,
          visualStatus: mapVisualStatus(selectedItem)
        }
      : undefined,
    emptyState: false,
    canAdvanceToSensitiveOperations: selectedItem ? mapVisualStatus(selectedItem) === 'ready' : false
  };
}

async function showOpenDialog(event: IpcMainInvokeEvent, options: OpenDialogOptions): Promise<string | undefined> {
  const window = BrowserWindow.fromWebContents(event.sender);
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);

  return result.canceled ? undefined : result.filePaths[0];
}

function isSafeRelativePath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]/).includes('..');
}

// Abre pastas e arquivos no VS Code (ou VSCodium) pelo comando de linha de comando.
function openInEditor(targets: string[]): Promise<SimpleResult> {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const tryCommand = (commands: string[]): Promise<SimpleResult> => {
    const [command, ...rest] = commands;

    if (!command) {
      return Promise.resolve({ ok: false, message: 'VS Code não encontrado. Instale o VS Code e confira se o comando "code" funciona no terminal.' });
    }

    return new Promise((resolve) => {
      const child = spawn(command, targets, { detached: true, stdio: 'ignore', env });
      child.once('error', () => resolve(tryCommand(rest)));
      child.once('spawn', () => {
        child.unref();
        resolve({ ok: true, message: 'Aberto no VS Code.' });
      });
    });
  };

  return tryCommand(['code', 'codium']);
}

function sanitizeCredentials(value: unknown): SvnCredentials | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<SvnCredentials>;

  return typeof candidate.username === 'string' && candidate.username.trim() && typeof candidate.password === 'string'
    ? { username: candidate.username.trim(), password: candidate.password }
    : undefined;
}

function registerIpcHandlers(): void {
  ipcMain.handle('environment:get-screen-state', async (_event, payload?: { environmentId?: string }) =>
    buildEnvironmentScreenState(payload?.environmentId)
  );

  ipcMain.handle('environment:register', async (_event, payload: RegisterEnvironmentInput): Promise<RegisterEnvironmentResponse> => {
    const registration = await registerSavedEnvironmentFromLocalPaths({
      name: payload?.name,
      gitWorkspacePath: payload?.gitWorkspacePath ?? '',
      svnCheckoutPath: payload?.svnCheckoutPath ?? '',
      baseBranch: payload?.baseBranch
    });
    const screen = await buildEnvironmentScreenState(registration.savedEnvironment?.id, registration.message);

    return { registration, screen };
  });

  ipcMain.handle('environment:remove', async (_event, payload: { environmentId: string }) => {
    const result = await removeSavedEnvironment({ environmentId: payload.environmentId });
    return buildEnvironmentScreenState(undefined, result.ok ? 'Ambiente removido da lista local. Nenhuma pasta foi apagada.' : result.message);
  });

  ipcMain.handle('dialog:select-directory', async (event, payload: { title: string; defaultPath?: string }) =>
    showOpenDialog(event, {
      title: payload.title,
      defaultPath: payload.defaultPath,
      properties: ['openDirectory', 'createDirectory']
    })
  );

  ipcMain.handle('sync:get-state', async (_event, payload?: { environmentId?: string }) =>
    buildSyncScreenState(payload?.environmentId)
  );

  ipcMain.handle('sync:execute', async (_event, payload?: { environmentId?: string }) =>
    executeSyncForEnvironment(payload?.environmentId)
  );

  ipcMain.handle('svn:wc-status', async (_event, payload: { environmentId?: string }): Promise<WorkingCopyStatus> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

    if (!selected) {
      return { ok: false, message: 'Nenhum projeto selecionado.', changes: [], conflicts: 0 };
    }

    return readWorkingCopyStatus(selected.svnCheckoutPath);
  });

  ipcMain.handle('svn:wc-diff', async (_event, payload: { environmentId?: string; filePath: string }): Promise<SyncFileDiff | undefined> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

    if (!selected || !isSafeRelativePath(payload?.filePath)) {
      return undefined;
    }

    return readWorkingCopyDiff(selected.svnCheckoutPath, payload.filePath);
  });

  ipcMain.handle('svn:incoming', async (_event, payload: { environmentId?: string }): Promise<IncomingResult> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);
    return selected ? countIncoming(selected.svnCheckoutPath) : { ok: false, message: 'Nenhum projeto selecionado.', incoming: 0 };
  });

  ipcMain.handle('svn:update', async (_event, payload: { environmentId?: string; credentials?: SvnCredentials }): Promise<UpdateResult> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

    if (!selected) {
      return { ok: false, message: 'Nenhum projeto selecionado.', updated: [], conflicts: [] };
    }

    return updateWorkingCopy(selected.svnCheckoutPath, { credentials: sanitizeCredentials(payload?.credentials) });
  });

  ipcMain.handle('svn:discard', async (_event, payload: { environmentId?: string; paths: string[] }): Promise<DiscardResult> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);
    const paths = Array.isArray(payload?.paths) ? payload.paths.filter(isSafeRelativePath) : [];

    if (!selected) {
      return { ok: false, message: 'Nenhum projeto selecionado.', discarded: [], errors: [] };
    }

    return discardChanges({ checkoutPath: selected.svnCheckoutPath, paths, moveToTrash: (target) => shell.trashItem(target) });
  });

  ipcMain.handle('sync:set-exclusion', async (_event, payload: { environmentId?: string; path: string; exclude: boolean }): Promise<SimpleResult> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

    if (!hasGit(selected) || !isSafeRelativePath(payload?.path) || payload.path === '.') {
      return { ok: false, message: 'Projeto ou caminho inválidos.' };
    }

    const rule = payload.path.replace(/\/+$/, '');
    const current = selected.syncExclusions ?? [];
    const next = payload.exclude
      ? [...new Set([...current.filter((item) => !item.startsWith(`${rule}/`)), rule])].sort()
      : current.filter((item) => item !== rule);
    const saved = await updateSavedEnvironment({ environmentId: selected.id, changes: { syncExclusions: next } });

    if (!saved.ok) {
      return { ok: false, message: saved.message };
    }

    return {
      ok: true,
      message: payload.exclude
        ? `${rule} não será mais copiado do Git para o SVN neste projeto.`
        : `${rule} volta a ser copiado do Git para o SVN.`
    };
  });

  ipcMain.handle('svn:ignore-on-commit', async (_event, payload: { environmentId?: string; path: string; ignore: boolean; recursive?: boolean }): Promise<SimpleResult> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

    if (!selected || !isSafeRelativePath(payload?.path)) {
      return { ok: false, message: 'Projeto ou caminho inválidos.' };
    }

    return setIgnoreOnCommit({ checkoutPath: selected.svnCheckoutPath, path: payload.path, ignore: payload.ignore === true, recursive: payload.recursive === true });
  });

  ipcMain.handle('svn:svn-ignore', async (_event, payload: { environmentId?: string; path: string; mode: 'item' | 'extension' }): Promise<SimpleResult> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

    if (!selected || !isSafeRelativePath(payload?.path)) {
      return { ok: false, message: 'Projeto ou caminho inválidos.' };
    }

    return addToSvnIgnore({ checkoutPath: selected.svnCheckoutPath, path: payload.path, mode: payload.mode === 'extension' ? 'extension' : 'item' });
  });

  ipcMain.handle('shell:open-in-editor', async (_event, payload: { environmentId?: string; which: 'git' | 'svn'; path?: string }): Promise<SimpleResult> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);
    const folder = payload?.which === 'git' ? selected?.gitWorkspacePath : selected?.svnCheckoutPath;

    if (!folder) {
      return { ok: false, message: 'Pasta do projeto não encontrada.' };
    }

    if (payload.path !== undefined && !isSafeRelativePath(payload.path)) {
      return { ok: false, message: 'Caminho inválido.' };
    }

    return openInEditor(payload.path ? [folder, path.join(folder, payload.path)] : [folder]);
  });

  ipcMain.handle('shell:show-item', async (_event, payload: { environmentId?: string; path: string }) => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

    if (selected && isSafeRelativePath(payload?.path)) {
      shell.showItemInFolder(path.join(selected.svnCheckoutPath, payload.path));
    }
  });

  ipcMain.handle('svn:commit-selected', async (_event, payload: CommitSelectedRequest): Promise<CommitSelectedResult> =>
    commitSelectedForEnvironment(payload)
  );

  ipcMain.handle('project:link-git', async (_event, payload: { environmentId: string; gitWorkspacePath: string; baseBranch?: string }): Promise<LinkGitResponse> => {
    if (typeof payload?.environmentId !== 'string' || typeof payload.gitWorkspacePath !== 'string') {
      return { ok: false, message: 'Projeto ou caminho inválidos.', blockers: [] };
    }

    return linkGitToSavedEnvironment({
      environmentId: payload.environmentId,
      gitWorkspacePath: payload.gitWorkspacePath,
      baseBranch: payload.baseBranch
    });
  });

  ipcMain.handle('repos:get-state', async (): Promise<RepositoriesState> => {
    const settings = await readAppSettings();
    return { roots: settings.repositoryRoots, defaultCheckoutDirectory: settings.checkoutDirectory };
  });

  ipcMain.handle('settings:set-checkout-directory', async (_event, payload: { directory: string }): Promise<string> => {
    const directory = typeof payload?.directory === 'string' ? payload.directory : '';
    return (await updateAppSettings({ checkoutDirectory: directory })).checkoutDirectory;
  });

  ipcMain.handle('repos:save-roots', async (_event, payload: { roots: RepositoryRoot[] }): Promise<RepositoryRoot[]> =>
    (await updateAppSettings({ repositoryRoots: Array.isArray(payload?.roots) ? payload.roots : [] })).repositoryRoots
  );

  ipcMain.handle('repos:list', async (_event, payload: { url: string; credentials?: SvnCredentials }): Promise<RemoteListing> =>
    listRemote(typeof payload?.url === 'string' ? payload.url : '', { credentials: sanitizeCredentials(payload?.credentials) })
  );

  ipcMain.handle('svn:checkout', async (event, payload: CheckoutRequest): Promise<CheckoutResponse> => {
    const operationId = typeof payload?.operationId === 'string' ? payload.operationId : '';
    const checkout = await checkoutProject({
      url: typeof payload?.url === 'string' ? payload.url : '',
      destination: typeof payload?.destination === 'string' ? payload.destination : '',
      revision: typeof payload?.revision === 'string' ? payload.revision : undefined,
      credentials: sanitizeCredentials(payload?.credentials),
      onProgress: ({ files, line }) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('svn:progress', { operationId, files, line });
        }
      }
    });

    if (!checkout.ok) {
      return { checkout };
    }

    const registration = await registerSavedEnvironmentFromLocalPaths({
      name: typeof payload.name === 'string' ? payload.name : undefined,
      svnCheckoutPath: checkout.destination
    });

    return { checkout, registration };
  });

  ipcMain.handle('git:list-branches', async (_event, payload: { environmentId?: string }): Promise<GitBranchList> => {
    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

    if (!hasGit(selected)) {
      return { ok: false, message: selected ? GIT_NOT_LINKED_MESSAGE : 'Nenhum ambiente selecionado.', detached: false, local: [], remote: [] };
    }

    return listGitBranches(selected.gitWorkspacePath);
  });

  ipcMain.handle(
    'git:switch-branch',
    async (_event, payload: { environmentId?: string; branch: string; kind: 'local' | 'remote' }): Promise<SwitchGitBranchResult> => {
      const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

      if (!hasGit(selected) || typeof payload?.branch !== 'string' || (payload.kind !== 'local' && payload.kind !== 'remote')) {
        return { ok: false, message: 'Ambiente ou branch inválidos.', errorCode: 'BRANCH_NOT_FOUND' };
      }

      return switchGitBranch({ gitRepositoryPath: selected.gitWorkspacePath, branch: payload.branch, kind: payload.kind });
    }
  );

  ipcMain.handle('appearance:get-theme', async (): Promise<AppTheme> => (await readAppSettings()).theme);

  ipcMain.handle('appearance:set-theme', async (_event, payload: { theme: AppTheme }): Promise<AppTheme> => {
    if (!isAppTheme(payload?.theme)) {
      return (await readAppSettings()).theme;
    }

    nativeTheme.themeSource = payload.theme;
    return (await updateAppSettings({ theme: payload.theme })).theme;
  });

  ipcMain.handle('sync:file-diff', async (_event, payload: { environmentId?: string; filePath: string }): Promise<SyncFileDiff | undefined> => {
    const selected = await resolveSelectedEnvironmentById(payload.environmentId);

    if (!hasGit(selected) || !payload.filePath || path.isAbsolute(payload.filePath) || payload.filePath.split(/[\\/]/).includes('..')) {
      return undefined;
    }

    return buildFileDiff({
      gitWorkspacePath: selected.gitWorkspacePath,
      svnCheckoutPath: selected.svnCheckoutPath,
      filePath: payload.filePath
    });
  });

  ipcMain.handle('svn:log', async (_event, payload: { environmentId?: string; url?: string; before?: string; credentials?: SvnCredentials }): Promise<SvnLogPage> => {
    const credentials = sanitizeCredentials(payload?.credentials);
    const before = typeof payload?.before === 'string' ? payload.before : undefined;

    if (typeof payload?.url === 'string') {
      if (!isSvnUrl(payload.url)) {
        return { ok: false, message: 'URL SVN inválida.', entries: [], hasMore: false };
      }

      return readLog({ url: payload.url, before, credentials });
    }

    const selected = await resolveSelectedEnvironmentById(payload?.environmentId);

    if (!selected) {
      return { ok: false, message: 'Nenhum projeto selecionado.', entries: [], hasMore: false };
    }

    return readLog({ checkoutPath: selected.svnCheckoutPath, before, credentials });
  });

  ipcMain.handle('svn:revision-diff', async (_event, payload: { repositoryRoot: string; revision: string; path: string; credentials?: SvnCredentials }): Promise<SyncFileDiff> => {
    const repositoryRoot = typeof payload?.repositoryRoot === 'string' && isSvnUrl(payload.repositoryRoot) ? payload.repositoryRoot : '';

    return readRevisionDiff({
      repositoryRoot,
      revision: typeof payload?.revision === 'string' ? payload.revision : '',
      path: typeof payload?.path === 'string' ? payload.path : '',
      credentials: sanitizeCredentials(payload?.credentials)
    });
  });

  ipcMain.handle('shell:open-environment-folder', async (_event, payload: { environmentId?: string; which: 'git' | 'svn' }) => {
    const selected = await resolveSelectedEnvironmentById(payload.environmentId);

    const folder = payload.which === 'git' ? selected?.gitWorkspacePath : selected?.svnCheckoutPath;

    if (folder) {
      await shell.openPath(folder);
    }
  });
}

// No X11, o Chromium descarta em silêncio ícones grandes (512 px passa de 1 MB
// na propriedade _NET_WM_ICON); 128 px chega à barra de tarefas.
function loadWindowIcon(): Electron.NativeImage {
  return nativeImage
    .createFromPath(path.join(__dirname, '..', 'assets', 'icon.png'))
    .resize({ width: 128, height: 128 });
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    title: 'SVNFlow',
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#24292e' : '#ffffff',
    icon: loadWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [`--svnflow-version=${app.getVersion()}`]
    }
  });

  const rendererEntry = path.join(__dirname, '..', 'renderer', 'index.html');
  window.loadFile(rendererEntry);

  return window;
}

app.whenReady().then(async () => {
  // Aplica o tema salvo antes de abrir a janela para evitar troca visível de cores.
  nativeTheme.themeSource = (await readAppSettings()).theme;
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
