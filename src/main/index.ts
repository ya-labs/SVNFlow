import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  ApplyPlanResponse,
  ApplySourceRequest,
  ChangeTotals,
  CommitScreenState,
  EnvironmentListEntry,
  EnvironmentScreenState,
  EnvironmentVisualStatus,
  ExecuteApplyResponse,
  ExportPackageRequest,
  PackagesScreenState,
  PreviewScreenState,
  RegisterEnvironmentInput,
  RegisterEnvironmentResponse,
  ScreenBlocker,
  ScreenWorkspaceFile,
  SyncCommitResponse,
  SyncExecuteResponse,
  SyncScreenState,
  WorkspaceScreenState
} from '../shared/ipc-types.js';
import { readAppSettings, updateAppSettings } from './commands/app-settings.js';
import { validateCommitPreConditions } from './commands/commit-validator.js';
import { executeCommit, type ExecuteCommitResult } from './commands/commit-executor.js';
import { generateGitPatch, readGitAuthor } from './commands/git-patch.js';
import { buildFileDiff, buildSyncPlan, executeSync, readSvnRevisionLog, suggestSyncCommitMessage, type SvnRevisionLog, type SyncFileDiff } from './commands/git-svn-sync.js';
import { buildMiniPrMarkdown, normalizeMiniPrDraft } from './commands/mini-pr.js';
import { exportSvnflowPackage, type ExportPackageResult } from './commands/package-exporter.js';
import { appendPackageHistory, readPackageHistory, type PackageHistoryResult } from './commands/package-history.js';
import { importAndValidateSvnflowPackage, readValidatedPackagePatch, type ImportPackageResult } from './commands/package-importer.js';
import { listPackageLibrary } from './commands/package-library.js';
import { buildPreviewContext } from './commands/preview.js';
import { buildPreviewScreenState } from './commands/preview-screen.js';
import { registerSavedEnvironmentFromLocalPaths } from './commands/register-saved-environment.js';
import { revalidateEnvironment } from './commands/revalidate-environment.js';
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
  type SavedEnvironmentValidationStatus,
  type SelectedEnvironment
} from './commands/saved-environments.js';
import { buildApplyPlan, executeApply, type ApplyPlanInput } from './commands/svn-apply-flow.js';
import { readSvnStatus } from './commands/svn-status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BASE_BRANCH = 'main';

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

function countChangeTotals(files: ScreenWorkspaceFile[]): ChangeTotals {
  const totals: ChangeTotals = { added: 0, modified: 0, deleted: 0, renamed: 0, copied: 0, unknown: 0 };
  const byCode: Record<string, keyof ChangeTotals> = { A: 'added', M: 'modified', D: 'deleted', R: 'renamed', C: 'copied' };

  for (const file of files) {
    totals[byCode[file.rawStatus.charAt(0)] ?? 'unknown'] += 1;
  }

  return totals;
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
    workspace: preview.workspace
      ? {
          ...preview.workspace,
          totals: countChangeTotals(preview.workspace.files)
        }
      : undefined,
    blockers: preview.blockers,
    alerts: preview.alerts,
    canExportPackage: preview.actions.canExportPackage.canAdvance,
    canApplyInSvn: preview.actions.canApplyInSvn.canAdvance
  };
}

function normalizeWorkspaceBlockers(blockers: Array<string | ScreenBlocker>): ScreenBlocker[] {
  return blockers.map((blocker) => {
    if (typeof blocker === 'string') {
      return {
        code: blocker,
        message: 'Existe um bloqueio no workspace Git. Revise o ambiente para continuar.'
      };
    }

    return blocker;
  });
}

async function buildWorkspaceRendererState(environmentId?: string): Promise<WorkspaceScreenState> {
  const selectedEnvironment = await resolveSelectedEnvironmentById(environmentId);
  const workspaceContext = buildPreviewContext({
    selectedEnvironment
  });
  const blockers = normalizeWorkspaceBlockers(workspaceContext.blockers);
  const hasChanges = Boolean(workspaceContext.summary?.hasSufficientChanges);

  return {
    status: workspaceContext.status === 'ready' ? 'ready' : 'blocked',
    title: 'Workspace Git',
    message: workspaceContext.message,
    environment: workspaceContext.environment
      ? {
          environmentName: workspaceContext.environment.name,
          gitWorkspacePath: workspaceContext.environment.gitWorkspacePath,
          svnCheckoutPath: workspaceContext.environment.svnCheckoutPath,
          svnCheckoutRoot: workspaceContext.environment.svnCheckoutRoot
        }
      : undefined,
    workspace: workspaceContext.workspace
      ? {
          branch: workspaceContext.workspace.branch,
          baseBranch: workspaceContext.workspace.baseBranch,
          totalAffectedFiles: workspaceContext.workspace.changedFilesCount,
          files: workspaceContext.workspace.classifiedFiles.map((file) => ({
            path: file.path,
            previousPath: file.previousPath,
            status: file.humanReadableStatus,
            description: file.description,
            rawStatus: file.rawStatus
          })),
          totals: workspaceContext.summary?.totalsByChangeType ?? countChangeTotals([])
        }
      : undefined,
    blockers,
    alerts: workspaceContext.alerts ?? [],
    hasChanges,
    canAdvanceToPreview: workspaceContext.canPreview && hasChanges && blockers.length === 0
  };
}

async function buildSyncScreenState(environmentId?: string, messageOverride?: string): Promise<SyncScreenState> {
  const selected = await resolveSelectedEnvironmentById(environmentId);

  if (!selected) {
    return {
      message: 'Nenhum ambiente cadastrado. Cadastre o repositório Git e o checkout SVN na etapa Ambiente.',
      canCommit: false
    };
  }

  const plan = buildSyncPlan({
    gitWorkspacePath: selected.gitWorkspacePath,
    svnCheckoutPath: selected.svnCheckoutPath
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

  if (!selected) {
    return { screen: await buildSyncScreenState(environmentId) };
  }

  const result = executeSync({
    gitWorkspacePath: selected.gitWorkspacePath,
    svnCheckoutPath: selected.svnCheckoutPath,
    confirmed: true
  });

  return { result, screen: await buildSyncScreenState(selected.id, result.message) };
}

async function commitSyncForEnvironment(environmentId: string | undefined, message: string): Promise<SyncCommitResponse> {
  const selected = await resolveSelectedEnvironmentById(environmentId);
  const screen = await buildSyncScreenState(environmentId);
  const trimmed = message.trim();

  if (!selected || !screen.plan?.source || !screen.canCommit) {
    return {
      result: {
        status: 'failed',
        message: screen.plan?.status === 'ready'
          ? 'O checkout ainda não está igual ao Git. Sincronize antes de commitar.'
          : screen.message,
        errorCode: 'PRECONDITIONS_NOT_MET'
      },
      screen
    };
  }

  if (!trimmed) {
    return {
      result: { status: 'failed', message: 'Informe a mensagem do commit SVN.', errorCode: 'INVALID_INPUT' },
      screen
    };
  }

  const result = executeCommit({ checkoutPath: selected.svnCheckoutPath, title: trimmed });

  if (result.status === 'success') {
    await updateSavedEnvironment({
      environmentId: selected.id,
      changes: { lastSyncedGitCommit: screen.plan.source.commit }
    });
    await appendPackageHistory({
      entry: {
        kind: 'committed',
        packageId: result.revision ? `r${result.revision}` : 'svn-commit',
        packagePath: '',
        environmentName: selected.name,
        baseBranch: screen.plan.source.branch ?? screen.plan.source.shortCommit,
        totalAffectedFiles: result.filesCommitted ?? 0,
        generatedAt: new Date().toISOString(),
        detail: `${trimmed.split('\n')[0]} (Git ${screen.plan.source.shortCommit})`
      }
    });
  }

  return { result, screen: await buildSyncScreenState(selected.id, result.message) };
}

async function buildPackagesScreenState(environmentId?: string): Promise<PackagesScreenState> {
  const [settings, preview, history, selected] = await Promise.all([
    readAppSettings(),
    buildPreviewRendererState(environmentId),
    readPackageHistory(),
    resolveSelectedEnvironmentById(environmentId)
  ]);
  const library = await listPackageLibrary({
    directory: settings.packagesDirectory,
    historyEntries: history.entries
  });

  return {
    packagesDirectory: settings.packagesDirectory,
    preview,
    author: selected ? readGitAuthor(selected.gitWorkspacePath) : undefined,
    library
  };
}

async function exportPackageFromPreview(request: ExportPackageRequest): Promise<ExportPackageResult> {
  const selected = await resolveSelectedEnvironmentById(request.environmentId);
  const preview = await buildPreviewRendererState(request.environmentId);

  if (!selected || !preview.environment || !preview.workspace || !preview.canExportPackage) {
    return {
      ok: false,
      message: preview.blockers[0]?.message ?? 'Preview indisponível ou bloqueado para exportação de pacote.',
      errorCode: 'INVALID_PREVIEW'
    };
  }

  const patch = generateGitPatch({
    gitRepositoryPath: selected.gitWorkspacePath,
    baseBranch: preview.workspace.baseBranch
  });

  if (!patch.ok) {
    return {
      ok: false,
      message: patch.message,
      errorCode: 'INVALID_PATCH'
    };
  }

  const settings = await readAppSettings();
  const exportResult = await exportSvnflowPackage({
    preview: {
      environment: preview.environment,
      workspace: preview.workspace,
      blockers: preview.blockers,
      alerts: preview.alerts
    },
    miniPr: request.miniPr,
    patchContent: patch.patchContent,
    author: readGitAuthor(selected.gitWorkspacePath),
    outputDirectory: settings.packagesDirectory
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
        generatedAt: exportResult.manifest.generatedAt,
        detail: request.miniPr.title
      }
    });
  }

  return exportResult;
}

type ResolvedApplyInput =
  | { ok: true; input: ApplyPlanInput; baseBranch: string }
  | { ok: false; message: string };

async function resolveApplyInput(environmentId: string | undefined, source: ApplySourceRequest): Promise<ResolvedApplyInput> {
  const selected = await resolveSelectedEnvironmentById(environmentId);

  if (!selected) {
    return { ok: false, message: 'Nenhum ambiente selecionado. Cadastre ou selecione um ambiente para aplicar alterações.' };
  }

  if (source.kind === 'package') {
    const validated = await readValidatedPackagePatch(source.packagePath);

    if (!validated.ok || !validated.patchContent) {
      return { ok: false, message: validated.message };
    }

    return {
      ok: true,
      baseBranch: validated.result.summary?.baseBranch ?? '',
      input: {
        environmentName: selected.name,
        svnCheckoutPath: selected.svnCheckoutPath,
        patchContent: validated.patchContent,
        source: {
          kind: 'package',
          label: `Pacote: ${validated.result.review?.title ?? path.basename(source.packagePath)}`,
          packagePath: validated.result.packagePath,
          packageId: validated.result.manifest?.packageId
        }
      }
    };
  }

  const preview = await buildPreviewRendererState(environmentId);

  if (!preview.canApplyInSvn || !preview.workspace) {
    return { ok: false, message: preview.blockers[0]?.message ?? preview.message };
  }

  const patch = generateGitPatch({
    gitRepositoryPath: selected.gitWorkspacePath,
    baseBranch: preview.workspace.baseBranch
  });

  if (!patch.ok) {
    return { ok: false, message: patch.message };
  }

  return {
    ok: true,
    baseBranch: preview.workspace.baseBranch,
    input: {
      environmentName: selected.name,
      svnCheckoutPath: selected.svnCheckoutPath,
      patchContent: patch.patchContent,
      source: {
        kind: 'workspace',
        label: `Workspace Git: ${preview.workspace.branch ?? 'branch atual'} comparada com ${preview.workspace.baseBranch}`
      }
    }
  };
}

async function buildApplyPlanResponse(environmentId: string | undefined, source: ApplySourceRequest): Promise<ApplyPlanResponse> {
  const resolved = await resolveApplyInput(environmentId, source);

  if (!resolved.ok) {
    return { ok: false, message: resolved.message };
  }

  const plan = buildApplyPlan(resolved.input);
  return { ok: plan.canConfirm, message: plan.message, plan };
}

async function executeApplyFromSource(environmentId: string | undefined, source: ApplySourceRequest): Promise<ExecuteApplyResponse> {
  const resolved = await resolveApplyInput(environmentId, source);

  if (!resolved.ok) {
    return { ok: false, message: resolved.message };
  }

  const result = executeApply({ ...resolved.input, confirmed: true });

  if (result.status === 'applied' || result.appliedFiles.length > 0) {
    await appendPackageHistory({
      entry: {
        kind: 'applied',
        packageId: resolved.input.source.packageId ?? 'workspace-local',
        packagePath: resolved.input.source.packagePath ?? '',
        environmentName: resolved.input.environmentName,
        baseBranch: resolved.baseBranch,
        totalAffectedFiles: result.appliedFiles.length,
        generatedAt: new Date().toISOString(),
        detail: resolved.input.source.label
      }
    });
  }

  return { ok: result.status === 'applied', message: result.message, result };
}

async function buildCommitScreenState(selectedEnvironmentId?: string): Promise<CommitScreenState> {
  const selected = await resolveSelectedEnvironmentById(selectedEnvironmentId);

  if (!selected) {
    return {
      status: 'blocked',
      title: 'Commit SVN Protegido',
      message: 'Nenhum ambiente selecionado. Selecione um ambiente para iniciar.',
      checkoutFiles: [],
      canExecuteCommit: false
    };
  }

  const validationResult = validateCommitPreConditions({
    checkoutPath: selected.svnCheckoutPath
  });
  const checkoutState = readSvnStatus({ checkoutPath: selected.svnCheckoutPath });
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
    checkoutFiles: checkoutState.files.map((file) => ({
      path: path.relative(selected.svnCheckoutPath, path.resolve(selected.svnCheckoutPath, file.path)) || file.path,
      status: file.rawCode,
      description: file.description
    })),
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

async function revalidateSelectedEnvironment(environmentId?: string): Promise<EnvironmentScreenState> {
  const screenState = await buildEnvironmentScreenState(environmentId);

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

  const revalidation = revalidateEnvironment({ environment: selected, baseBranch: selected.baseBranch });
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
}

async function showOpenDialog(event: IpcMainInvokeEvent, options: OpenDialogOptions): Promise<string | undefined> {
  const window = BrowserWindow.fromWebContents(event.sender);
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);

  return result.canceled ? undefined : result.filePaths[0];
}

function registerIpcHandlers(): void {
  ipcMain.handle('environment:get-screen-state', async (_event, payload?: { environmentId?: string }) =>
    buildEnvironmentScreenState(payload?.environmentId)
  );

  ipcMain.handle('environment:revalidate', async (_event, payload?: { environmentId?: string }) =>
    revalidateSelectedEnvironment(payload?.environmentId)
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

  ipcMain.handle('dialog:select-package-file', async (event, payload?: { defaultPath?: string }) =>
    showOpenDialog(event, {
      title: 'Selecionar pacote .svnflow',
      defaultPath: payload?.defaultPath,
      properties: ['openFile'],
      filters: [{ name: 'Pacote SVNFlow', extensions: ['svnflow'] }]
    })
  );

  ipcMain.handle('sync:get-state', async (_event, payload?: { environmentId?: string }) =>
    buildSyncScreenState(payload?.environmentId)
  );

  ipcMain.handle('sync:execute', async (_event, payload?: { environmentId?: string }) =>
    executeSyncForEnvironment(payload?.environmentId)
  );

  ipcMain.handle('sync:commit', async (_event, payload: { environmentId?: string; message: string }) =>
    commitSyncForEnvironment(payload.environmentId, payload.message ?? '')
  );

  ipcMain.handle('sync:file-diff', async (_event, payload: { environmentId?: string; filePath: string }): Promise<SyncFileDiff | undefined> => {
    const selected = await resolveSelectedEnvironmentById(payload.environmentId);

    if (!selected || !payload.filePath || path.isAbsolute(payload.filePath) || payload.filePath.split(/[\\/]/).includes('..')) {
      return undefined;
    }

    return buildFileDiff({
      gitWorkspacePath: selected.gitWorkspacePath,
      svnCheckoutPath: selected.svnCheckoutPath,
      filePath: payload.filePath
    });
  });

  ipcMain.handle('sync:revision-log', async (_event, payload: { environmentId?: string; revision: string }): Promise<SvnRevisionLog> => {
    const selected = await resolveSelectedEnvironmentById(payload.environmentId);

    if (!selected) {
      return { ok: false, message: 'Nenhum ambiente selecionado.', revision: payload.revision, paths: [] };
    }

    return readSvnRevisionLog(selected.svnCheckoutPath, payload.revision);
  });

  ipcMain.handle('shell:open-environment-folder', async (_event, payload: { environmentId?: string; which: 'git' | 'svn' }) => {
    const selected = await resolveSelectedEnvironmentById(payload.environmentId);

    if (selected) {
      await shell.openPath(payload.which === 'git' ? selected.gitWorkspacePath : selected.svnCheckoutPath);
    }
  });

  ipcMain.handle('workspace:get-screen-state', async (_event, payload?: { environmentId?: string }) =>
    buildWorkspaceRendererState(payload?.environmentId)
  );

  ipcMain.handle('preview:get-screen-state', async (_event, payload?: { environmentId?: string }) =>
    buildPreviewRendererState(payload?.environmentId)
  );

  ipcMain.handle('packages:get-screen-state', async (_event, payload?: { environmentId?: string }) =>
    buildPackagesScreenState(payload?.environmentId)
  );

  ipcMain.handle('packages:set-directory', async (_event, payload: { directory: string }) => {
    const settings = await updateAppSettings({ packagesDirectory: payload.directory });
    return settings.packagesDirectory;
  });

  ipcMain.handle('packages:preview-pr-md', async (_event, payload: ExportPackageRequest): Promise<string> => {
    const [selected, preview] = await Promise.all([
      resolveSelectedEnvironmentById(payload.environmentId),
      buildPreviewRendererState(payload.environmentId)
    ]);

    return buildMiniPrMarkdown(normalizeMiniPrDraft(payload.miniPr), {
      environmentName: preview.environment?.environmentName ?? 'não identificado',
      branch: preview.workspace?.branch,
      baseBranch: preview.workspace?.baseBranch ?? DEFAULT_BASE_BRANCH,
      author: selected ? readGitAuthor(selected.gitWorkspacePath) : undefined,
      generatedAt: new Date().toISOString(),
      files: preview.workspace?.files ?? []
    });
  });

  ipcMain.handle('packages:export', async (_event, payload: ExportPackageRequest): Promise<ExportPackageResult> =>
    exportPackageFromPreview(payload)
  );

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
          generatedAt: result.manifest.generatedAt,
          detail: result.review?.title
        }
      });
    }

    return result;
  });

  ipcMain.handle('packages:read-history', async (): Promise<PackageHistoryResult> => readPackageHistory());

  ipcMain.handle('apply:get-plan', async (_event, payload: { environmentId?: string; source: ApplySourceRequest }) =>
    buildApplyPlanResponse(payload.environmentId, payload.source)
  );

  ipcMain.handle('apply:execute', async (_event, payload: { environmentId?: string; source: ApplySourceRequest }) =>
    executeApplyFromSource(payload.environmentId, payload.source)
  );

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

      const validation = validateCommitPreConditions({ checkoutPath: selected.svnCheckoutPath });

      if (!validation.canCommit) {
        return {
          status: 'failed',
          message: validation.blockers[0]?.message ?? validation.message,
          errorCode: 'PRECONDITIONS_NOT_MET'
        };
      }

      const result = executeCommit({
        checkoutPath: selected.svnCheckoutPath,
        title: payload.title,
        description: payload.description
      });

      if (result.status === 'success') {
        await appendPackageHistory({
          entry: {
            kind: 'committed',
            packageId: result.revision ? `r${result.revision}` : 'svn-commit',
            packagePath: '',
            environmentName: selected.name,
            baseBranch: selected.baseBranch ?? DEFAULT_BASE_BRANCH,
            totalAffectedFiles: result.filesCommitted ?? 0,
            generatedAt: new Date().toISOString(),
            detail: payload.title
          }
        });
      }

      return result;
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
      sandbox: false,
      additionalArguments: [`--svnflow-version=${app.getVersion()}`]
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
