import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('svnflowDesktop', {
  appName: 'SVNFlow',
  shellStatus: 'Renderer carregado com sucesso.'
});
