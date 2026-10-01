import { contextBridge, ipcRenderer } from 'electron';

import type { SvnflowDesktopApi, SvnProgressEvent } from '../shared/ipc-types.js';

function readAppVersion(): string {
  const argument = process.argv.find((item) => item.startsWith('--svnflow-version='));
  return argument?.split('=')[1] ?? 'dev';
}

const api: SvnflowDesktopApi = {
  appName: 'SVNFlow',
  appVersion: readAppVersion(),
  getEnvironmentScreenState: (environmentId) =>
    ipcRenderer.invoke('environment:get-screen-state', { environmentId }),
  revalidateEnvironment: (environmentId) =>
    ipcRenderer.invoke('environment:revalidate', { environmentId }),
  registerEnvironment: (input) =>
    ipcRenderer.invoke('environment:register', input),
  removeEnvironment: (environmentId) =>
    ipcRenderer.invoke('environment:remove', { environmentId }),
  selectDirectory: (title, defaultPath) =>
    ipcRenderer.invoke('dialog:select-directory', { title, defaultPath }),
  selectPackageFile: (defaultPath) =>
    ipcRenderer.invoke('dialog:select-package-file', { defaultPath }),
  getSyncScreenState: (environmentId) =>
    ipcRenderer.invoke('sync:get-state', { environmentId }),
  executeSync: (environmentId) =>
    ipcRenderer.invoke('sync:execute', { environmentId }),
  getWorkingCopyStatus: (environmentId) =>
    ipcRenderer.invoke('svn:wc-status', { environmentId }),
  getWorkingCopyDiff: (environmentId, filePath) =>
    ipcRenderer.invoke('svn:wc-diff', { environmentId, filePath }),
  commitSelected: (request) =>
    ipcRenderer.invoke('svn:commit-selected', request),
  getIncoming: (environmentId) =>
    ipcRenderer.invoke('svn:incoming', { environmentId }),
  discardChanges: (environmentId, paths) =>
    ipcRenderer.invoke('svn:discard', { environmentId, paths }),
  setIgnoreOnCommit: (environmentId, path, ignore, recursive) =>
    ipcRenderer.invoke('svn:ignore-on-commit', { environmentId, path, ignore, recursive }),
  setSyncExclusion: (environmentId, path, exclude) =>
    ipcRenderer.invoke('sync:set-exclusion', { environmentId, path, exclude }),
  addToSvnIgnore: (environmentId, path, mode) =>
    ipcRenderer.invoke('svn:svn-ignore', { environmentId, path, mode }),
  openInEditor: (environmentId, which, path) =>
    ipcRenderer.invoke('shell:open-in-editor', { environmentId, which, path }),
  showItemInFolder: (environmentId, path) =>
    ipcRenderer.invoke('shell:show-item', { environmentId, path }),
  updateWorkingCopy: (environmentId, credentials) =>
    ipcRenderer.invoke('svn:update', { environmentId, credentials }),
  getSyncFileDiff: (environmentId, filePath) =>
    ipcRenderer.invoke('sync:file-diff', { environmentId, filePath }),
  readSvnLog: (request) =>
    ipcRenderer.invoke('svn:log', request),
  readRevisionDiff: (request) =>
    ipcRenderer.invoke('svn:revision-diff', request),
  openEnvironmentFolder: (environmentId, which) =>
    ipcRenderer.invoke('shell:open-environment-folder', { environmentId, which }),
  linkGit: (environmentId, gitWorkspacePath, baseBranch) =>
    ipcRenderer.invoke('project:link-git', { environmentId, gitWorkspacePath, baseBranch }),
  getRepositoriesState: () =>
    ipcRenderer.invoke('repos:get-state'),
  saveRepositoryRoots: (roots) =>
    ipcRenderer.invoke('repos:save-roots', { roots }),
  listRemote: (url, credentials) =>
    ipcRenderer.invoke('repos:list', { url, credentials }),
  checkout: (request) =>
    ipcRenderer.invoke('svn:checkout', request),
  onSvnProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: SvnProgressEvent) => listener(payload);
    ipcRenderer.on('svn:progress', handler);
    return () => {
      ipcRenderer.removeListener('svn:progress', handler);
    };
  },
  listGitBranches: (environmentId) =>
    ipcRenderer.invoke('git:list-branches', { environmentId }),
  switchGitBranch: (environmentId, branch, kind) =>
    ipcRenderer.invoke('git:switch-branch', { environmentId, branch, kind }),
  getTheme: () =>
    ipcRenderer.invoke('appearance:get-theme'),
  setCheckoutDirectory: (directory) =>
    ipcRenderer.invoke('settings:set-checkout-directory', { directory }),
  setTheme: (theme) =>
    ipcRenderer.invoke('appearance:set-theme', { theme }),
  getWorkspaceScreenState: (environmentId) =>
    ipcRenderer.invoke('workspace:get-screen-state', { environmentId }),
  getPreviewScreenState: (environmentId) =>
    ipcRenderer.invoke('preview:get-screen-state', { environmentId }),
  getPackagesScreenState: (environmentId) =>
    ipcRenderer.invoke('packages:get-screen-state', { environmentId }),
  setPackagesDirectory: (directory) =>
    ipcRenderer.invoke('packages:set-directory', { directory }),
  previewMiniPrMarkdown: (request) =>
    ipcRenderer.invoke('packages:preview-pr-md', request),
  exportPackage: (request) =>
    ipcRenderer.invoke('packages:export', request),
  importAndValidatePackage: (packagePath) =>
    ipcRenderer.invoke('packages:import-and-validate', { packagePath }),
  readPackageHistory: () =>
    ipcRenderer.invoke('packages:read-history'),
  getApplyPlan: (environmentId, source) =>
    ipcRenderer.invoke('apply:get-plan', { environmentId, source }),
  executeApply: (environmentId, source) =>
    ipcRenderer.invoke('apply:execute', { environmentId, source }),
  getCommitScreenState: (environmentId) =>
    ipcRenderer.invoke('commit:get-screen-state', { environmentId }),
  executeCommit: (environmentId, title, description) =>
    ipcRenderer.invoke('commit:execute', { environmentId, title, description })
};

contextBridge.exposeInMainWorld('svnflowDesktop', api);
