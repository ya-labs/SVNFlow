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
      ],
      classifiedFiles: [
        {
          path: 'src/app.ts',
          status: 'modified',
          rawStatus: 'M',
          humanReadableStatus: 'Modificado',
          description: 'Modificado: src/app.ts'
        },
        {
          path: 'src/novo.ts',
          status: 'added',
          rawStatus: 'A',
          humanReadableStatus: 'Criado',
          description: 'Criado: src/novo.ts'
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

  it('classifica arquivos com descrições humanas e preserva caminhos anteriores', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {
        workspace: {
          branch: 'feature/classif',
          baseBranch: 'main',
          hasChanges: true,
          changedFiles: [
            {
              path: 'src/novo-arquivo.ts',
              status: 'added',
              rawStatus: 'A'
            },
            {
              path: 'src/modificado.ts',
              status: 'modified',
              rawStatus: 'M'
            },
            {
              path: 'src/deletado.ts',
              status: 'deleted',
              rawStatus: 'D'
            },
            {
              path: 'src/novo-nome.ts',
              status: 'renamed',
              rawStatus: 'R',
              previousPath: 'src/nome-antigo.ts'
            },
            {
              path: 'src/copia.ts',
              status: 'copied',
              rawStatus: 'C',
              previousPath: 'src/original.ts'
            },
            {
              path: 'src/desconhecido.ts',
              status: 'unknown',
              rawStatus: 'X'
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
        id: 'env-5',
        name: 'Projeto com classificação',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(result.workspace?.classifiedFiles).toEqual([
      {
        path: 'src/novo-arquivo.ts',
        status: 'added',
        rawStatus: 'A',
        humanReadableStatus: 'Criado',
        description: 'Criado: src/novo-arquivo.ts'
      },
      {
        path: 'src/modificado.ts',
        status: 'modified',
        rawStatus: 'M',
        humanReadableStatus: 'Modificado',
        description: 'Modificado: src/modificado.ts'
      },
      {
        path: 'src/deletado.ts',
        status: 'deleted',
        rawStatus: 'D',
        humanReadableStatus: 'Removido',
        description: 'Removido: src/deletado.ts'
      },
      {
        path: 'src/novo-nome.ts',
        status: 'renamed',
        rawStatus: 'R',
        previousPath: 'src/nome-antigo.ts',
        humanReadableStatus: 'Renomeado',
        description: 'Renomeado: src/nome-antigo.ts → src/novo-nome.ts'
      },
      {
        path: 'src/copia.ts',
        status: 'copied',
        rawStatus: 'C',
        previousPath: 'src/original.ts',
        humanReadableStatus: 'Copiado',
        description: 'Copiado: src/original.ts → src/copia.ts'
      },
      {
        path: 'src/desconhecido.ts',
        status: 'unknown',
        rawStatus: 'X',
        humanReadableStatus: 'Desconhecido',
        description: 'Desconhecido: src/desconhecido.ts'
      }
    ]);
    expect(result.summary?.totalsByChangeType).toEqual({
      added: 1,
      modified: 1,
      deleted: 1,
      renamed: 1,
      copied: 1,
      unknown: 1
    });
  });

  it('detecta arquivo com status desconhecido e gera alerta', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {
        workspace: {
          branch: 'feature/com-risco',
          baseBranch: 'main',
          hasChanges: true,
          changedFiles: [
            {
              path: 'src/arquivo-normal.ts',
              status: 'modified',
              rawStatus: 'M'
            },
            {
              path: 'src/arquivo-misterioso.ts',
              status: 'unknown',
              rawStatus: 'X'
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
        id: 'env-6',
        name: 'Projeto com risco',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(result.canPreview).toBe(true);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts?.[0]).toEqual({
      code: 'UNKNOWN_FILE_STATUS',
      message: '1 arquivo(s) com status desconhecido.',
      severity: 'warning',
      affectedFiles: ['src/arquivo-misterioso.ts']
    });
  });

  it('detecta potenciais arquivos binários e gera alerta informativo', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {
        workspace: {
          branch: 'feature/com-binarios',
          baseBranch: 'main',
          hasChanges: true,
          changedFiles: [
            {
              path: 'src/documento.pdf',
              status: 'added',
              rawStatus: 'A'
            },
            {
              path: 'assets/imagem.png',
              status: 'modified',
              rawStatus: 'M'
            },
            {
              path: 'src/codigo.ts',
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
        id: 'env-7',
        name: 'Projeto com binários',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(result.canPreview).toBe(true);
    expect(result.alerts).toHaveLength(1);
    const binaryAlert = result.alerts?.find((a) => a.code === 'POTENTIAL_BINARY_FILES');
    expect(binaryAlert).toBeDefined();
    expect(binaryAlert?.affectedFiles).toEqual(['src/documento.pdf', 'assets/imagem.png']);
    expect(binaryAlert?.severity).toBe('info');
  });

  it('bloqueia avanço quando não há alterações', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {
        workspace: {
          branch: 'feature/sem-mudancas',
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
        id: 'env-8',
        name: 'Projeto sem mudanças',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(result.canPreview).toBe(true);
    expect(result.summary?.hasSufficientChanges).toBe(false);
    expect(result.blockers).toHaveLength(1);
    const noChangesBlocker = result.blockers[0];
    expect(noChangesBlocker).toEqual({
      code: 'NO_CHANGES',
      message: 'Nenhuma alteração foi detectada. Revise o branch ou faça modificações antes de prosseguir.'
    });
  });

  it('retorna múltiplos alertas quando há múltiplos riscos', () => {
    mockValidateEnvironmentState.mockReturnValue({
      status: 'ready',
      message: 'Ambiente pronto para leitura e revisão.',
      git: {
        workspace: {
          branch: 'feature/multiplos-riscos',
          baseBranch: 'main',
          hasChanges: true,
          changedFiles: [
            {
              path: 'src/video.mp4',
              status: 'added',
              rawStatus: 'A'
            },
            {
              path: 'src/stale-file.ts',
              status: 'unknown',
              rawStatus: 'X'
            },
            {
              path: 'src/audio.mp3',
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
        id: 'env-9',
        name: 'Projeto com múltiplos riscos',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(result.alerts).toHaveLength(2);
    const unknownAlert = result.alerts?.find((a) => a.code === 'UNKNOWN_FILE_STATUS');
    const binaryAlert = result.alerts?.find((a) => a.code === 'POTENTIAL_BINARY_FILES');
    expect(unknownAlert).toBeDefined();
    expect(binaryAlert).toBeDefined();
    expect(binaryAlert?.affectedFiles).toEqual(['src/video.mp4', 'src/audio.mp3']);
  });
});

