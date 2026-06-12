import { buildMainInterfaceState } from '../interface-state';

describe('buildMainInterfaceState', () => {
  it('reflete ambiente selecionado na interface principal', () => {
    const result = buildMainInterfaceState({
      selectedEnvironment: {
        id: 'env-1',
        name: 'Projeto principal',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      }
    });

    expect(result.environment.status).toBe('ready');
    expect(result.environment.active?.name).toBe('Projeto principal');
    expect(result.environment.message).toContain('Ambiente ativo');
    expect(result.visual.profile.reference).toBe('YA_LABS');
    expect(result.visual.messageStyles.preview.kind).toBe('neutral');
  });

  it('reflete preview sem recalcular dados fora do estado recebido', () => {
    const result = buildMainInterfaceState({
      previewState: {
        status: 'ready',
        title: 'Preview pronto',
        message: 'Preview disponível.',
        designSystemReference: 'YA_LABS',
        workspace: {
          baseBranch: 'main',
          totalAffectedFiles: 3,
          files: []
        },
        blockers: [],
        alerts: [
          {
            code: 'POTENTIAL_BINARY_FILES',
            message: '1 arquivo potencialmente binário.',
            severity: 'info'
          }
        ],
        miniPrLocal: {
          draft: {
            title: 'titulo',
            context: 'contexto',
            whatChanged: 'mudanças',
            notes: ''
          },
          validation: {
            isValid: true,
            pendingRequiredFields: []
          }
        },
        actions: {
          canExportPackage: { canAdvance: true },
          canApplyInSvn: { canAdvance: true }
        }
      }
    });

    expect(result.preview.status).toBe('ready');
    expect(result.preview.summary?.totalAffectedFiles).toBe(3);
    expect(result.preview.summary?.alertsCount).toBe(1);
    expect(result.visual.messageStyles.preview.kind).toBe('success');
  });

  it('exibe estado bloqueado de preview com mensagens compreensíveis', () => {
    const result = buildMainInterfaceState({
      previewState: {
        status: 'blocked',
        title: 'Preview bloqueado',
        message: 'Selecione um ambiente válido.',
        designSystemReference: 'YA_LABS',
        blockers: [
          {
            code: 'NO_SELECTED_ENVIRONMENT',
            message: 'Selecione um ambiente válido.'
          }
        ],
        alerts: [],
        miniPrLocal: {
          draft: {
            title: '',
            context: '',
            whatChanged: '',
            notes: ''
          },
          validation: {
            isValid: false,
            pendingRequiredFields: ['title', 'context', 'whatChanged']
          }
        },
        actions: {
          canExportPackage: { canAdvance: false, reason: 'Bloqueado' },
          canApplyInSvn: { canAdvance: false, reason: 'Bloqueado' }
        }
      }
    });

    expect(result.preview.status).toBe('blocked');
    expect(result.preview.blockers).toEqual(['Selecione um ambiente válido.']);
    expect(result.visual.messageStyles.preview.kind).toBe('blocked');
  });

  it('exibe estado de sucesso da aplicação SVN quando pronto para revisão', () => {
    const result = buildMainInterfaceState({
      postApplyStatus: {
        reviewStatus: 'ready-for-review',
        message: 'Patch aplicado. Revise as alterações.',
        checkoutState: {
          status: 'dirty',
          message: 'Alterações locais.',
          files: [],
          hasConflicts: false,
          hasUnexpectedChanges: false
        },
        appliedFiles: ['src/app.ts'],
        canAdvance: true
      }
    });

    expect(result.svnApply.status).toBe('success');
    expect(result.svnApply.affectedFilesCount).toBe(1);
    expect(result.svnApply.hasConflicts).toBe(false);
    expect(result.visual.messageStyles.svnApply.kind).toBe('success');
  });

  it('exibe estado de erro ou bloqueio da aplicação SVN de forma clara', () => {
    const blocked = buildMainInterfaceState({
      postApplyStatus: {
        reviewStatus: 'requires-correction',
        message: 'Conflitos detectados após aplicação.',
        checkoutState: {
          status: 'blocked',
          message: 'Conflitos no checkout.',
          files: [],
          hasConflicts: true,
          hasUnexpectedChanges: false
        },
        appliedFiles: [],
        canAdvance: false
      }
    });

    const error = buildMainInterfaceState({
      postApplyStatus: {
        reviewStatus: 'error',
        message: 'Aplicação não realizada.',
        checkoutState: {
          status: 'blocked',
          message: 'Aplicação não realizada.',
          files: [],
          hasConflicts: false,
          hasUnexpectedChanges: false
        },
        appliedFiles: [],
        canAdvance: false
      }
    });

    expect(blocked.svnApply.status).toBe('blocked');
    expect(error.svnApply.status).toBe('error');
    expect(blocked.visual.messageStyles.svnApply.kind).toBe('blocked');
    expect(error.visual.messageStyles.svnApply.kind).toBe('error');
  });
});
