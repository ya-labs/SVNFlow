import { buildShellVisualState } from '../shell-visual';

describe('buildShellVisualState', () => {
  it('retorna tela inicial navegável com área principal', () => {
    const result = buildShellVisualState();

    expect(result.status).toBe('ready');
    expect(result.regions.main.title).toContain('Área principal');
    expect(result.regions.sidebar.navigation.length).toBeGreaterThan(0);
  });

  it('permite identificar a área principal do fluxo', () => {
    const result = buildShellVisualState({ activeStage: 'preview' });

    expect(result.currentAreaLabel).toBe('Preview');
    expect(result.regions.main.title).toContain('Preview');
  });

  it('estrutura contempla etapas ambiente, preview, aplicação, commit e pacotes', () => {
    const result = buildShellVisualState();
    const keys = result.regions.sidebar.navigation.map((item) => item.key);

    expect(keys).toEqual(['environment', 'preview', 'apply', 'commit', 'packages']);
  });

  it('não executa operação sensível por conta própria', () => {
    const result = buildShellVisualState();

    expect(result.executesSensitiveOperations).toBe(false);
    expect(result.regions.statusBar.message).toContain('Nenhuma operação sensível');
  });

  it('mantém referência visual da YA LABS no shell', () => {
    const result = buildShellVisualState();

    expect(result.designSystemReference).toBe('YA_LABS');
    expect(result.visualProfile.reference).toBe('YA_LABS');
    expect(result.visualProfile.mode).toBe('operational-clarity');
  });

  it('habilita somente etapas até a etapa ativa', () => {
    const result = buildShellVisualState({ activeStage: 'apply' });

    const nav = result.regions.sidebar.navigation;
    expect(nav.find((item) => item.key === 'environment')?.enabled).toBe(true);
    expect(nav.find((item) => item.key === 'preview')?.enabled).toBe(true);
    expect(nav.find((item) => item.key === 'apply')?.enabled).toBe(true);
    expect(nav.find((item) => item.key === 'commit')?.enabled).toBe(false);
    expect(nav.find((item) => item.key === 'packages')?.enabled).toBe(false);
  });
});
