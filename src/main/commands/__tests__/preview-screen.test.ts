import { buildPreviewContext } from '../preview';
import { buildPreviewScreenState } from '../preview-screen';

jest.mock('../preview');

const mockBuildPreviewContext = buildPreviewContext as jest.MockedFunction<typeof buildPreviewContext>;

describe('buildPreviewScreenState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('monta estado visual pronto com ambiente, workspace e arquivos', () => {
    mockBuildPreviewContext.mockReturnValue({
      status: 'ready',
      canPreview: true,
      message: 'Preview pronto para o ambiente Projeto local.',
      environment: {
        id: 'env-1',
        name: 'Projeto local',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn',
        svnCheckoutRoot: '/repo/svn'
      },
      workspace: {
        branch: 'feature/x',
        baseBranch: 'main',
        hasChanges: true,
        changedFilesCount: 1,
        changedFiles: [
          {
            path: 'src/app.ts',
            status: 'modified',
            rawStatus: 'M'
          }
        ],
        classifiedFiles: [
          {
            path: 'src/app.ts',
            status: 'modified',
            rawStatus: 'M',
            humanReadableStatus: 'Modificado',
            description: 'Modificado: src/app.ts'
          }
        ]
      },
      summary: {
        branch: 'feature/x',
        baseBranch: 'main',
        activeEnvironment: {
          id: 'env-1',
          name: 'Projeto local'
        },
        totalAffectedFiles: 1,
        totalsByChangeType: {
          added: 0,
          modified: 1,
          deleted: 0,
          renamed: 0,
          copied: 0,
          unknown: 0
        },
        hasSufficientChanges: true
      },
      blockers: [],
      alerts: [
        {
          code: 'POTENTIAL_BINARY_FILES',
          message: '1 arquivo(s) potencialmente binario(s).',
          severity: 'info',
          affectedFiles: ['assets/logo.png']
        }
      ]
    });

    const result = buildPreviewScreenState({
      selectedEnvironment: {
        id: 'env-1',
        name: 'Projeto local',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(result.status).toBe('ready');
    expect(result.title).toBe('Preview de alterações');
    expect(result.designSystemReference).toBe('YA_LABS');
    expect(result.environment).toEqual({
      environmentName: 'Projeto local',
      gitWorkspacePath: '/repo/git',
      svnCheckoutPath: '/repo/svn',
      svnCheckoutRoot: '/repo/svn'
    });
    expect(result.workspace).toEqual({
      branch: 'feature/x',
      baseBranch: 'main',
      totalAffectedFiles: 1,
      files: [
        {
          path: 'src/app.ts',
          previousPath: undefined,
          status: 'Modificado',
          description: 'Modificado: src/app.ts',
          rawStatus: 'M'
        }
      ]
    });
    expect(result.actions).toEqual({
      canExportPackage: {
        canAdvance: true
      },
      canApplyInSvn: {
        canAdvance: true
      }
    });
  });

  it('bloqueia ações quando preview retorna bloqueios', () => {
    mockBuildPreviewContext.mockReturnValue({
      status: 'ready',
      canPreview: true,
      message: 'Nenhuma alteração encontrada para o ambiente Projeto local.',
      environment: {
        id: 'env-2',
        name: 'Projeto local',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      },
      workspace: {
        branch: 'feature/sem-mudancas',
        baseBranch: 'main',
        hasChanges: false,
        changedFilesCount: 0,
        changedFiles: [],
        classifiedFiles: []
      },
      summary: {
        branch: 'feature/sem-mudancas',
        baseBranch: 'main',
        activeEnvironment: {
          id: 'env-2',
          name: 'Projeto local'
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
      },
      blockers: [
        {
          code: 'NO_CHANGES',
          message: 'Nenhuma alteração foi detectada. Revise o branch ou faça modificações antes de prosseguir.'
        }
      ],
      alerts: []
    });

    const result = buildPreviewScreenState({
      selectedEnvironment: {
        id: 'env-2',
        name: 'Projeto local',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(result.status).toBe('blocked');
    expect(result.title).toBe('Preview bloqueado');
    expect(result.actions.canExportPackage).toEqual({
      canAdvance: false,
      reason: 'Nenhuma alteração foi detectada. Revise o branch ou faça modificações antes de prosseguir.'
    });
    expect(result.actions.canApplyInSvn).toEqual({
      canAdvance: false,
      reason: 'Nenhuma alteração foi detectada. Revise o branch ou faça modificações antes de prosseguir.'
    });
  });

  it('normaliza bloqueio em string para estrutura visual', () => {
    mockBuildPreviewContext.mockReturnValue({
      status: 'blocked',
      canPreview: false,
      message: 'Selecione um ambiente válido antes de gerar o preview.',
      blockers: ['NO_SELECTED_ENVIRONMENT']
    });

    const result = buildPreviewScreenState({});

    expect(result.status).toBe('blocked');
    expect(result.blockers).toEqual([
      {
        code: 'NO_SELECTED_ENVIRONMENT',
        message: 'Existe um bloqueio no preview. Verifique o ambiente para continuar.'
      }
    ]);
    expect(result.actions.canExportPackage.canAdvance).toBe(false);
    expect(result.actions.canApplyInSvn.canAdvance).toBe(false);
  });
});
