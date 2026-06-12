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

contextBridge.exposeInMainWorld('svnflowDesktop', {
  appName: 'SVNFlow',
  shellStatus: 'Renderer carregado com sucesso.',
  getEnvironmentScreenState: (environmentId?: string): Promise<EnvironmentScreenState> =>
    ipcRenderer.invoke('environment:get-screen-state', { environmentId }),
  revalidateEnvironment: (environmentId?: string): Promise<EnvironmentScreenState> =>
    ipcRenderer.invoke('environment:revalidate', { environmentId })
});
