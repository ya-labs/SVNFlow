import { contextBridge, ipcRenderer } from 'electron';

import type { SvnflowDesktopApi } from '../shared/ipc-types.js';

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
  commitSync: (environmentId, message) =>
    ipcRenderer.invoke('sync:commit', { environmentId, message }),
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
