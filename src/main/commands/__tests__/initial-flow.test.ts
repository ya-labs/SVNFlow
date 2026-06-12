import { checkInitialFlowGate, loadInitialFlowFromSavedEnvironment } from '../initial-flow';
import { validateEnvironmentState } from '../environment';

jest.mock('../environment');

const mockValidateEnvironmentState = validateEnvironmentState as jest.MockedFunction<typeof validateEnvironmentState>;

describe('checkInitialFlowGate', () => {
  it('permite avanço quando ambiente está pronto', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {
        workspace: {
          branch: 'feature/workspace',
          baseBranch: 'main',
          hasChanges: true,
          changedFiles: [
            {
              path: 'src/app.ts',
              status: 'modified',
              rawStatus: 'M'
            }
          ]
        }
      } as never,
      svn: {} as never
    });

    const result = checkInitialFlowGate({
      gitRepositoryPath: '/repo/git',
      svnCheckoutPath: '/repo/svn'
    });

    expect(result.canAdvance).toBe(true);
    expect(result.message).toBe('Ambiente pronto para leitura e revisão.');
    expect(result.workspace).toEqual({
      branch: 'feature/workspace',
      baseBranch: 'main',
      hasChanges: true,
      changedFilesCount: 1
    });
  });

  it('bloqueia avanço quando ambiente está bloqueado', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'blocked',
      message: 'Git não encontrado. Instale o Git e reinicie o SVNFlow.',
      git: {
        workspace: {
          baseBranch: 'main',
          hasChanges: false,
          changedFiles: []
        }
      } as never,
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
      git: {
        workspace: {
          baseBranch: 'main',
          hasChanges: false,
          changedFiles: []
        }
      } as never,
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
      git: {
        workspace: {
          branch: 'feature/workspace',
          baseBranch: 'main',
          hasChanges: false,
          changedFiles: []
        }
      } as never,
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

describe('loadInitialFlowFromSavedEnvironment', () => {
  it('carrega caminhos Git e SVN no estado inicial do fluxo', () => {
    const result = loadInitialFlowFromSavedEnvironment('env-1', [
      {
        id: 'env-1',
        name: 'Projeto Local',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn',
        lastValidationStatus: 'ready',
        lastValidatedAt: '2026-06-12T10:00:00.000Z'
      }
    ]);

    expect(result).toEqual({
      gitRepositoryPath: '/repo/git',
      svnCheckoutPath: '/repo/svn',
      selectedEnvironmentId: 'env-1',
      selectedEnvironmentName: 'Projeto Local',
      needsRevalidation: true,
      safeForSensitiveOperations: false,
      message: 'Ambiente Projeto Local selecionado. Revalide antes de continuar.'
    });
  });

  it('retorna estado vazio quando ambiente não existe', () => {
    const result = loadInitialFlowFromSavedEnvironment('inexistente', []);

    expect(result).toEqual({
      gitRepositoryPath: '',
      svnCheckoutPath: '',
      selectedEnvironmentId: 'inexistente',
      selectedEnvironmentName: '',
      needsRevalidation: true,
      safeForSensitiveOperations: false,
      message: 'Ambiente salvo não encontrado.'
    });
  });
});
