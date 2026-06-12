import { getYaLabsVisualProfile, getVisualMessageStyle } from '../ya-labs-visual';

describe('ya-labs-visual', () => {
  it('fornece perfil visual YA LABS com foco em clareza operacional', () => {
    const profile = getYaLabsVisualProfile();

    expect(profile.reference).toBe('YA_LABS');
    expect(profile.mode).toBe('operational-clarity');
    expect(profile.tokens.colors.accent).toBeDefined();
  });

  it('retorna estilo de sucesso para mensagens de confirmação', () => {
    const style = getVisualMessageStyle('success');

    expect(style.kind).toBe('success');
    expect(style.icon).toBe('check');
  });

  it('retorna estilo de warning para mensagens de risco', () => {
    const style = getVisualMessageStyle('warning');

    expect(style.kind).toBe('warning');
    expect(style.icon).toBe('alert');
  });

  it('retorna estilo de blocked para bloqueios', () => {
    const style = getVisualMessageStyle('blocked');

    expect(style.kind).toBe('blocked');
    expect(style.icon).toBe('block');
  });

  it('retorna estilo neutro por padrão para mensagens informativas', () => {
    const style = getVisualMessageStyle('neutral');

    expect(style.kind).toBe('neutral');
    expect(style.icon).toBe('info');
  });
});
