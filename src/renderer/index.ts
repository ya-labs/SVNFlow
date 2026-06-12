declare global {
  interface Window {
    svnflowDesktop?: {
      appName: string;
      shellStatus: string;
    };
  }
}

function renderAppBootstrap(): void {
  const appName = window.svnflowDesktop?.appName ?? 'SVNFlow';
  const shellStatus = window.svnflowDesktop?.shellStatus ?? 'Interface carregada.';

  const title = document.querySelector<HTMLElement>('[data-role="app-title"]');
  const status = document.querySelector<HTMLElement>('[data-role="app-status"]');
  const subtitle = document.querySelector<HTMLElement>('[data-role="app-subtitle"]');

  if (title) {
    title.textContent = appName;
  }

  if (subtitle) {
    subtitle.textContent = 'Camada renderer desktop ativa';
  }

  if (status) {
    status.textContent = shellStatus;
  }
}

window.addEventListener('DOMContentLoaded', renderAppBootstrap);

export {};
