import { validateEnvironmentState } from '../environment';
import { buildPreviewContext } from '../preview';

jest.mock('../environment');

const mockValidateEnvironmentState = validateEnvironmentState as jest.MockedFunction<typeof validateEnvironmentState>;

describe('buildPreviewContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bloqueia preview quando nenhum ambiente foi selecionado', () => {
    const result = buildPreviewContext({});

    expect(result.canPreview).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.message).toContain('Selecione um ambiente');
    expect(result.blockers).toEqual(['NO_SELECTED_ENVIRONMENT']);
    expect(mockValidateEnvironmentState).not.toHaveBeenCalled();
  });

  it('informa ambiente ativo e arquivos afetados quando o ambiente está válido', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {
        workspace: {
          branch: 'feature/preview',
          baseBranch: 'main',
          hasChanges: true,
          changedFiles: [
            {
              path: 'src/app.ts',
              status: 'modified',
              rawStatus: 'M'
            },
            {
              path: 'src/novo.ts',
              status: 'added',
              rawStatus: 'A'
            }
          ]
        }
      } as never,
      svn: {
        checkout: {
          checkoutRoot: '/repo/svn'
        }
      } as never
    });

    const result = buildPreviewContext({
      selectedEnvironment: {
        id: 'env-1',
        name: 'Projeto local',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(mockValidateEnvironmentState).toHaveBeenCalledWith({
      gitRepositoryPath: '/repo/git',
      svnCheckoutPath: '/repo/svn',
      baseBranch: undefined
    });
    expect(result.canPreview).toBe(true);
    expect(result.environment).toEqual({
      id: 'env-1',
      name: 'Projeto local',
      gitWorkspacePath: '/repo/git',
      svnCheckoutPath: '/repo/svn',
      svnCheckoutRoot: '/repo/svn'
    });
    expect(result.workspace).toEqual({
      branch: 'feature/preview',
      baseBranch: 'main',
      hasChanges: true,
      changedFilesCount: 2,
      changedFiles: [
        {
          path: 'src/app.ts',
          status: 'modified',
          rawStatus: 'M'
        },
        {
          path: 'src/novo.ts',
          status: 'added',
          rawStatus: 'A'
        }
      ]
    });
    expect(result.summary).toEqual({
      branch: 'feature/preview',
      baseBranch: 'main',
      activeEnvironment: {
        id: 'env-1',
        name: 'Projeto local'
      },
      totalAffectedFiles: 2,
      totalsByChangeType: {
        added: 1,
        modified: 1,
        deleted: 0,
        renamed: 0,
        copied: 0,
        unknown: 0
      },
      hasSufficientChanges: true
    });
  });

  it('usa o workspace Git do ambiente selecionado para montar o preview', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {
        workspace: {
          branch: 'feature/base-customizada',
          baseBranch: 'develop',
          hasChanges: true,
          changedFiles: []
        }
      } as never,
      svn: {
        checkout: {}
      } as never
    });

    buildPreviewContext({
      selectedEnvironment: {
        id: 'env-2',
        name: 'Ambiente homologação',
        gitWorkspacePath: '/ambiente/git',
        svnCheckoutPath: '/ambiente/svn'
      },
      baseBranch: 'develop'
    });

    expect(mockValidateEnvironmentState).toHaveBeenCalledWith({
      gitRepositoryPath: '/ambiente/git',
      svnCheckoutPath: '/ambiente/svn',
      baseBranch: 'develop'
    });
  });

  it('bloqueia preview quando o ambiente selecionado não valida', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'blocked',
      message: 'O caminho informado não é um checkout SVN válido.',
      git: {
        repository: {},
        workspace: {
          branch: 'feature/preview',
          baseBranch: 'main',
          hasChanges: false,
          changedFiles: []
        }
      } as never,
      svn: {
        checkout: {
          error: 'SVN_CHECKOUT_INVALID'
        }
      } as never
    });

    const result = buildPreviewContext({
      selectedEnvironment: {
        id: 'env-3',
        name: 'Ambiente quebrado',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn-quebrado'
      }
    });

    expect(result.canPreview).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.message).toBe('O caminho informado não é um checkout SVN válido.');
    expect(result.environment).toEqual({
      id: 'env-3',
      name: 'Ambiente quebrado',
      gitWorkspacePath: '/repo/git',
      svnCheckoutPath: '/repo/svn-quebrado',
      svnCheckoutRoot: undefined
    });
    expect(result.blockers).toEqual(['SVN_CHECKOUT_INVALID']);
    expect(result.summary).toEqual({
      branch: 'feature/preview',
      baseBranch: 'main',
      activeEnvironment: {
        id: 'env-3',
        name: 'Ambiente quebrado'
      },
      totalAffectedFiles: 0,
      totalsByChangeType: {
        added: 0,
        modified: 0,
        deleted: 0,
        renamed: 0,
        copied: 0,
        unknown: 0
      },
      hasSufficientChanges: false
    });
  });

  it('diferencia cenário sem alterações e sinaliza insuficiência para seguir', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {
        workspace: {
          branch: 'feature/sem-alteracoes',
          baseBranch: 'main',
          hasChanges: false,
          changedFiles: []
        }
      } as never,
      svn: {
        checkout: {
          checkoutRoot: '/repo/svn'
        }
      } as never
    });

    const result = buildPreviewContext({
      selectedEnvironment: {
        id: 'env-4',
        name: 'Ambiente limpo',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(result.canPreview).toBe(true);
    expect(result.message).toBe('Nenhuma alteração encontrada para o ambiente Ambiente limpo.');
    expect(result.summary).toEqual({
      branch: 'feature/sem-alteracoes',
      baseBranch: 'main',
      activeEnvironment: {
        id: 'env-4',
        name: 'Ambiente limpo'
      },
      totalAffectedFiles: 0,
      totalsByChangeType: {
        added: 0,
        modified: 0,
        deleted: 0,
        renamed: 0,
        copied: 0,
        unknown: 0
      },
      hasSufficientChanges: false
    });
  });
});
