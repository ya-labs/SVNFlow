// Tipos compartilhados entre processo principal, preload e renderer.
// Contém apenas tipos: nada deste arquivo existe em tempo de execução.
import type { RegisterSavedEnvironmentResult } from '../main/commands/register-saved-environment.js';
import type { SavedEnvironmentValidationStatus } from '../main/commands/saved-environments.js';
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
  ExecuteSyncResult,
  GitBranch,
  GitBranchList,
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
  registerEnvironment: (input: RegisterEnvironmentInput) => Promise<RegisterEnvironmentResponse>;
  removeEnvironment: (environmentId: string) => Promise<EnvironmentScreenState>;
  selectDirectory: (title: string, defaultPath?: string) => Promise<string | undefined>;
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
}
