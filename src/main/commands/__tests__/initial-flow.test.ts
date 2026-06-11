import { checkInitialFlowGate } from '../initial-flow';
import { validateEnvironmentState } from '../environment';

jest.mock('../environment');

const mockValidateEnvironmentState = validateEnvironmentState as jest.MockedFunction<typeof validateEnvironmentState>;

describe('checkInitialFlowGate', () => {
  it('permite avanço quando ambiente está pronto', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {} as never,
      svn: {} as never
    });

    const result = checkInitialFlowGate({
      gitRepositoryPath: '/repo/git',
      svnCheckoutPath: '/repo/svn'
    });

    expect(result.canAdvance).toBe(true);
    expect(result.message).toBe('Ambiente pronto para leitura e revisão.');
  });

  it('bloqueia avanço quando ambiente está bloqueado', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'blocked',
      message: 'Git não encontrado. Instale o Git e reinicie o SVNFlow.',
      git: {} as never,
      svn: {} as never
    });

    const result = checkInitialFlowGate({
      gitRepositoryPath: '/repo/git',
      svnCheckoutPath: '/repo/svn'
    });

    expect(result.canAdvance).toBe(false);
    expect(result.message).toBe('Git não encontrado. Instale o Git e reinicie o SVNFlow.');
  });

  it('bloqueia avanço quando ambiente tem erro', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'error',
      message: 'O caminho informado não é um repositório Git válido.',
      git: {} as never,
      svn: {} as never
    });

    const result = checkInitialFlowGate({
      gitRepositoryPath: '/caminho/invalido',
      svnCheckoutPath: '/repo/svn'
    });

    expect(result.canAdvance).toBe(false);
    expect(result.message).toBe('O caminho informado não é um repositório Git válido.');
  });

  it('bloqueia avanço quando SVN ausente', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'blocked',
      message: 'SVN não encontrado. Instale o SVN e reinicie o SVNFlow.',
      git: {} as never,
      svn: {} as never
    });

    const result = checkInitialFlowGate({
      gitRepositoryPath: '/repo/git',
      svnCheckoutPath: '/repo/svn'
    });

    expect(result.canAdvance).toBe(false);
    expect(result.message).toBe('SVN não encontrado. Instale o SVN e reinicie o SVNFlow.');
  });
});
