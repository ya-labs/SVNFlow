// Tipos compartilhados entre processo principal, preload e renderer.
// Contém apenas tipos: nada deste arquivo existe em tempo de execução.
import type { ExecuteCommitResult } from '../main/commands/commit-executor.js';
import type { MiniPrDraft } from '../main/commands/mini-pr.js';
import type { ExportPackageResult } from '../main/commands/package-exporter.js';
import type { PackageHistoryResult } from '../main/commands/package-history.js';
import type { ImportPackageResult } from '../main/commands/package-importer.js';
import type { PackageLibraryResult } from '../main/commands/package-library.js';
import type { RegisterSavedEnvironmentResult } from '../main/commands/register-saved-environment.js';
import type { SavedEnvironmentValidationStatus } from '../main/commands/saved-environments.js';
import type { ApplyPlan, ExecuteApplyResult } from '../main/commands/svn-apply-flow.js';
import type { RepositoryRoot } from '../main/commands/app-settings.js';
import type { CheckoutResult } from '../main/commands/svn-checkout.js';
import type { SvnCredentials } from '../main/commands/svn-client.js';
import type { RemoteEntry, RemoteListing } from '../main/commands/svn-repository-browser.js';
import type { CommitSelectedResult, DiscardResult, IncomingResult, SimpleResult, UpdateResult, WorkingCopyChange, WorkingCopyStatus } from '../main/commands/svn-working-copy.js';
import type { GitBranch, GitBranchList, SwitchGitBranchResult } from '../main/commands/git-branches.js';
import type { ExecuteSyncResult, SyncFileDiff, SyncPlan } from '../main/commands/git-svn-sync.js';
import type { SvnLogPage } from '../main/commands/svn-history.js';
import type { SvnXmlLogEntry } from '../main/commands/svn-xml.js';

export type {
  ApplyPlan,
  ExecuteApplyResult,
  ExecuteCommitResult,
  ExecuteSyncResult,
  ExportPackageResult,
  GitBranch,
  GitBranchList,
  ImportPackageResult,
  MiniPrDraft,
  PackageHistoryResult,
  PackageLibraryResult,
  CheckoutResult,
  CommitSelectedResult,
  DiscardResult,
  SimpleResult,
  IncomingResult,
  UpdateResult,
  RegisterSavedEnvironmentResult,
  RemoteEntry,
  RemoteListing,
  RepositoryRoot,
  SvnCredentials,
  SvnLogPage,
  SvnXmlLogEntry,
  SwitchGitBranchResult,
  SyncFileDiff,
  SyncPlan,
  WorkingCopyChange,
  WorkingCopyStatus
};

export type EnvironmentVisualStatus = 'ready' | 'attention' | 'blocked' | 'error' | 'pending';

export interface EnvironmentListEntry {
  id: string;
  name: string;
  lastValidationStatus: SavedEnvironmentValidationStatus;
  needsRevalidation: boolean;
  visualStatus: EnvironmentVisualStatus;
}

export interface EnvironmentScreenState {
  message: string;
  storagePath: string;
  items: EnvironmentListEntry[];
  selectedEnvironmentId?: string;
  selected?: {
    id: string;
    name: string;
    gitWorkspacePath?: string;
    svnCheckoutPath: string;
    baseBranch: string;
    visualStatus: EnvironmentVisualStatus;
  };
  emptyState: boolean;
  canAdvanceToSensitiveOperations: boolean;
}

export interface RegisterEnvironmentInput {
  name?: string;
  gitWorkspacePath?: string;
  svnCheckoutPath: string;
  baseBranch?: string;
}

export interface RegisterEnvironmentResponse {
  registration: RegisterSavedEnvironmentResult;
  screen: EnvironmentScreenState;
}

export interface ScreenEnvironment {
  environmentName: string;
  gitWorkspacePath?: string;
  svnCheckoutPath: string;
  svnCheckoutRoot?: string;
}

export interface ScreenWorkspaceFile {
  path: string;
  previousPath?: string;
  status: string;
  description: string;
  rawStatus: string;
}

export interface ScreenBlocker {
  code: string;
  message: string;
  affectedFiles?: string[];
}

export interface ScreenAlert {
  code: string;
  message: string;
  severity: 'info' | 'warning';
  affectedFiles?: string[];
}

export interface PreviewScreenState {
  status: 'ready' | 'blocked';
  title: string;
  message: string;
  environment?: ScreenEnvironment;
  workspace?: {
    branch?: string;
    baseBranch: string;
    totalAffectedFiles: number;
    files: ScreenWorkspaceFile[];
    totals: ChangeTotals;
  };
  blockers: ScreenBlocker[];
  alerts: ScreenAlert[];
  canExportPackage: boolean;
  canApplyInSvn: boolean;
}

export interface ChangeTotals {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  copied: number;
  unknown: number;
}

export interface WorkspaceScreenState {
  status: 'ready' | 'blocked';
  title: string;
  message: string;
  environment?: ScreenEnvironment;
  workspace?: {
    branch?: string;
    baseBranch: string;
    totalAffectedFiles: number;
    files: ScreenWorkspaceFile[];
    totals: ChangeTotals;
  };
  blockers: ScreenBlocker[];
  alerts: ScreenAlert[];
  hasChanges: boolean;
  canAdvanceToPreview: boolean;
}

export interface PackagesScreenState {
  packagesDirectory: string;
  preview: PreviewScreenState;
  author?: string;
  library: PackageLibraryResult;
}

export interface ExportPackageRequest {
  environmentId?: string;
  miniPr: MiniPrDraft;
}

export interface CommitScreenState {
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
  checkoutFiles: Array<{ path: string; status: string; description: string }>;
  canExecuteCommit: boolean;
}

export type ApplySourceRequest =
  | { kind: 'workspace' }
  | { kind: 'package'; packagePath: string };

export interface ApplyPlanResponse {
  ok: boolean;
  message: string;
  plan?: ApplyPlan;
}

export interface ExecuteApplyResponse {
  ok: boolean;
  message: string;
  result?: ExecuteApplyResult;
}

export interface SyncScreenState {
  message: string;
  environment?: {
    id: string;
    name: string;
    gitWorkspacePath?: string;
    svnCheckoutPath: string;
  };
  plan?: SyncPlan;
  lastSyncedCommit?: string;
  suggestedCommitMessage?: string;
  canCommit: boolean;
}

export interface SyncExecuteResponse {
  result?: ExecuteSyncResult;
  screen: SyncScreenState;
}

export interface CommitSelectedRequest {
  environmentId?: string;
  paths: string[];
  message: string;
  credentials?: SvnCredentials;
  // Commit pela visão "Ver alterações do checkout SVN": publica o checkout como está,
  // mesmo com diferenças do Git ainda não copiadas.
  allowGitDifferences?: boolean;
}

export type AppTheme = 'system' | 'light' | 'dark';

export interface LinkGitResponse {
  ok: boolean;
  message: string;
  blockers: Array<{ code: string; message: string }>;
}

export interface RepositoriesState {
  roots: RepositoryRoot[];
  defaultCheckoutDirectory: string;
}

export interface CheckoutRequest {
  operationId: string;
  url: string;
  destination: string;
  revision?: string;
  name?: string;
  credentials?: SvnCredentials;
}

export interface CheckoutResponse {
  checkout: CheckoutResult;
  registration?: RegisterSavedEnvironmentResult;
}

export interface SvnProgressEvent {
  operationId: string;
  files: number;
  line: string;
}

export interface SvnflowDesktopApi {
  appName: string;
  appVersion: string;
  getEnvironmentScreenState: (environmentId?: string) => Promise<EnvironmentScreenState>;
  revalidateEnvironment: (environmentId?: string) => Promise<EnvironmentScreenState>;
  registerEnvironment: (input: RegisterEnvironmentInput) => Promise<RegisterEnvironmentResponse>;
  removeEnvironment: (environmentId: string) => Promise<EnvironmentScreenState>;
  selectDirectory: (title: string, defaultPath?: string) => Promise<string | undefined>;
  selectPackageFile: (defaultPath?: string) => Promise<string | undefined>;
  getSyncScreenState: (environmentId?: string) => Promise<SyncScreenState>;
  executeSync: (environmentId?: string) => Promise<SyncExecuteResponse>;
  getWorkingCopyStatus: (environmentId: string | undefined) => Promise<WorkingCopyStatus>;
  getWorkingCopyDiff: (environmentId: string | undefined, filePath: string) => Promise<SyncFileDiff | undefined>;
  commitSelected: (request: CommitSelectedRequest) => Promise<CommitSelectedResult>;
  getIncoming: (environmentId: string | undefined) => Promise<IncomingResult>;
  discardChanges: (environmentId: string | undefined, paths: string[]) => Promise<DiscardResult>;
  setIgnoreOnCommit: (environmentId: string | undefined, path: string, ignore: boolean, recursive?: boolean) => Promise<SimpleResult>;
  setSyncExclusion: (environmentId: string | undefined, path: string, exclude: boolean) => Promise<SimpleResult>;
  addToSvnIgnore: (environmentId: string | undefined, path: string, mode: 'item' | 'extension') => Promise<SimpleResult>;
  openInEditor: (environmentId: string | undefined, which: 'git' | 'svn', path?: string) => Promise<SimpleResult>;
  showItemInFolder: (environmentId: string | undefined, path: string) => Promise<void>;
  updateWorkingCopy: (environmentId: string | undefined, credentials?: SvnCredentials) => Promise<UpdateResult>;
  getSyncFileDiff: (environmentId: string | undefined, filePath: string) => Promise<SyncFileDiff | undefined>;
  readSvnLog: (request: { environmentId?: string; url?: string; before?: string; credentials?: SvnCredentials }) => Promise<SvnLogPage>;
  readRevisionDiff: (request: { repositoryRoot: string; revision: string; path: string; credentials?: SvnCredentials }) => Promise<SyncFileDiff>;
  openEnvironmentFolder: (environmentId: string | undefined, which: 'git' | 'svn') => Promise<void>;
  linkGit: (environmentId: string, gitWorkspacePath: string, baseBranch?: string) => Promise<LinkGitResponse>;
  getRepositoriesState: () => Promise<RepositoriesState>;
  saveRepositoryRoots: (roots: RepositoryRoot[]) => Promise<RepositoryRoot[]>;
  listRemote: (url: string, credentials?: SvnCredentials) => Promise<RemoteListing>;
  checkout: (request: CheckoutRequest) => Promise<CheckoutResponse>;
  onSvnProgress: (listener: (event: SvnProgressEvent) => void) => () => void;
  listGitBranches: (environmentId: string | undefined) => Promise<GitBranchList>;
  switchGitBranch: (environmentId: string | undefined, branch: string, kind: 'local' | 'remote') => Promise<SwitchGitBranchResult>;
  getTheme: () => Promise<AppTheme>;
  setTheme: (theme: AppTheme) => Promise<AppTheme>;
  setCheckoutDirectory: (directory: string) => Promise<string>;
  getWorkspaceScreenState: (environmentId?: string) => Promise<WorkspaceScreenState>;
  getPreviewScreenState: (environmentId?: string) => Promise<PreviewScreenState>;
  getPackagesScreenState: (environmentId?: string) => Promise<PackagesScreenState>;
  setPackagesDirectory: (directory: string) => Promise<string>;
  previewMiniPrMarkdown: (request: ExportPackageRequest) => Promise<string>;
  exportPackage: (request: ExportPackageRequest) => Promise<ExportPackageResult>;
  importAndValidatePackage: (packagePath: string) => Promise<ImportPackageResult>;
  readPackageHistory: () => Promise<PackageHistoryResult>;
  getApplyPlan: (environmentId: string | undefined, source: ApplySourceRequest) => Promise<ApplyPlanResponse>;
  executeApply: (environmentId: string | undefined, source: ApplySourceRequest) => Promise<ExecuteApplyResponse>;
  getCommitScreenState: (environmentId?: string) => Promise<CommitScreenState>;
  executeCommit: (environmentId: string, title: string, description?: string) => Promise<ExecuteCommitResult>;
}
