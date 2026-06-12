import { contextBridge, ipcRenderer } from 'electron';

interface EnvironmentScreenState {
  message: string;
  storagePath: string;
  items: Array<{
    id: string;
    name: string;
    lastValidationStatus: 'ready' | 'blocked' | 'error' | 'pending';
    needsRevalidation: boolean;
    visualStatus: 'ready' | 'attention' | 'blocked' | 'error' | 'pending';
  }>;
  selectedEnvironmentId?: string;
  selected?: {
    id: string;
    name: string;
    gitWorkspacePath: string;
    svnCheckoutPath: string;
    visualStatus: 'ready' | 'attention' | 'blocked' | 'error' | 'pending';
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
  canApplyInSvn: boolean;
}

contextBridge.exposeInMainWorld('svnflowDesktop', {
  appName: 'SVNFlow',
  shellStatus: 'Renderer carregado com sucesso.',
  getEnvironmentScreenState: (environmentId?: string): Promise<EnvironmentScreenState> =>
    ipcRenderer.invoke('environment:get-screen-state', { environmentId }),
  revalidateEnvironment: (environmentId?: string): Promise<EnvironmentScreenState> =>
    ipcRenderer.invoke('environment:revalidate', { environmentId }),
  getPreviewScreenState: (environmentId?: string): Promise<PreviewScreenState> =>
    ipcRenderer.invoke('preview:get-screen-state', { environmentId })
});
