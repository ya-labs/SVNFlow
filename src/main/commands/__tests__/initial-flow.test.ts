import { checkInitialFlowGate, loadInitialFlowFromSavedEnvironment } from '../initial-flow';
import { validateEnvironmentState } from '../environment';
import { revalidateEnvironment } from '../revalidate-environment';

jest.mock('../environment');
jest.mock('../revalidate-environment');

const mockValidateEnvironmentState = validateEnvironmentState as jest.MockedFunction<typeof validateEnvironmentState>;
const mockRevalidateEnvironment = revalidateEnvironment as jest.MockedFunction<typeof revalidateEnvironment>;

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
    ], { performRevalidation: false });

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

  it('executa revalidação em tempo real quando performRevalidation é true', () => {
    mockRevalidateEnvironment.mockReturnValue({
      canAdvance: true,
      safeForSensitiveOperations: true,
      message: 'Ambiente Projeto Válido validado com sucesso.',
      blockers: [],
      environment: {
        id: 'env-2',
        name: 'Projeto Válido',
        gitWorkspacePath: process.cwd(),
        svnCheckoutPath: process.cwd(),
        currentValidationStatus: 'ready',
        isValid: true,
        safeForSensitiveOperations: true,
        blockers: [],
        message: 'Ambiente Projeto Válido validado com sucesso.'
      }
    });

    const result = loadInitialFlowFromSavedEnvironment('env-2', [
      {
        id: 'env-2',
        name: 'Projeto Válido',
        gitWorkspacePath: process.cwd(),
        svnCheckoutPath: process.cwd(),
        lastValidationStatus: 'blocked'
      }
    ], { performRevalidation: true });

    expect(result.selectedEnvironmentId).toBe('env-2');
    expect(result.selectedEnvironmentName).toBe('Projeto Válido');
    expect(result.safeForSensitiveOperations).toBe(true);
    expect(result.needsRevalidation).toBe(false);
    expect(result.blockers).toBeDefined();
    expect(mockRevalidateEnvironment).toHaveBeenCalledWith({
      environment: {
        id: 'env-2',
        name: 'Projeto Válido',
        gitWorkspacePath: process.cwd(),
        svnCheckoutPath: process.cwd()
      },
      baseBranch: undefined
    });
  });

  it('bloqueia avanço quando caminho Git é inválido na revalidação', () => {
    mockRevalidateEnvironment.mockReturnValue({
      canAdvance: false,
      safeForSensitiveOperations: false,
      message: 'O caminho informado não é um repositório Git válido.',
      blockers: [{ code: 'GIT_REPOSITORY_INVALID', message: 'O caminho do workspace Git não é um repositório válido.' }]
    });

    const result = loadInitialFlowFromSavedEnvironment('env-3', [
      {
        id: 'env-3',
        name: 'Git Inválido',
        gitWorkspacePath: '/nonexistent/git/path',
        svnCheckoutPath: process.cwd()
      }
    ], { performRevalidation: true });

    expect(result.safeForSensitiveOperations).toBe(false);
    expect(result.needsRevalidation).toBe(true);
    expect(result.blockers?.length).toBeGreaterThan(0);
  });

  it('bloqueia avanço quando caminho SVN é inválido na revalidação', () => {
    mockRevalidateEnvironment.mockReturnValue({
      canAdvance: false,
      safeForSensitiveOperations: false,
      message: 'O caminho informado não é um checkout SVN válido.',
      blockers: [{ code: 'SVN_CHECKOUT_INVALID', message: 'O caminho do checkout SVN não é um checkout válido.' }]
    });

    const result = loadInitialFlowFromSavedEnvironment('env-4', [
      {
        id: 'env-4',
        name: 'SVN Inválido',
        gitWorkspacePath: process.cwd(),
        svnCheckoutPath: '/nonexistent/svn/path'
      }
    ], { performRevalidation: true });

    expect(result.safeForSensitiveOperations).toBe(false);
    expect(result.needsRevalidation).toBe(true);
    expect(result.blockers?.length).toBeGreaterThan(0);
  });
});
