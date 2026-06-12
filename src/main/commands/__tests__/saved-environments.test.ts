import { listSavedEnvironments, selectSavedEnvironment } from '../saved-environments';

describe('listSavedEnvironments', () => {
  it('lista ambientes por nome amigável com campos principais', () => {
    const result = listSavedEnvironments({
      now: '2026-06-12T12:00:00.000Z',
      environments: [
        {
          id: 'env-b',
          name: 'Ambiente B',
          gitWorkspacePath: '/git/b',
          svnCheckoutPath: '/svn/b',
          lastValidationStatus: 'ready',
          lastValidatedAt: '2026-06-12T11:30:00.000Z'
        },
        {
          id: 'env-a',
          name: 'Ambiente A',
          gitWorkspacePath: '/git/a',
          svnCheckoutPath: '/svn/a',
          lastValidationStatus: 'blocked',
          lastValidatedAt: '2026-06-12T10:00:00.000Z'
        }
      ]
    });

    expect(result.items.map((item) => item.name)).toEqual(['Ambiente A', 'Ambiente B']);
    expect(result.items[0]).toMatchObject({
      gitWorkspacePath: '/git/a',
      svnCheckoutPath: '/svn/a',
      lastValidationStatus: 'blocked'
    });
  });

  it('marca como pendente quando sem validação recente', () => {
    const result = listSavedEnvironments({
      now: '2026-06-12T12:00:00.000Z',
      revalidationMaxAgeMinutes: 30,
      environments: [
        {
          id: 'env-1',
          name: 'Sem validação',
          gitWorkspacePath: '/git/1',
          svnCheckoutPath: '/svn/1'
        },
        {
          id: 'env-2',
          name: 'Validação antiga',
          gitWorkspacePath: '/git/2',
          svnCheckoutPath: '/svn/2',
          lastValidationStatus: 'ready',
          lastValidatedAt: '2026-06-12T11:00:00.000Z'
        }
      ]
    });

    expect(result.items[0].lastValidationStatus).toBe('pending');
    expect(result.items[0].needsRevalidation).toBe(true);
    expect(result.items[1].needsRevalidation).toBe(true);
    expect(result.items[0].safeForSensitiveOperations).toBe(false);
    expect(result.items[1].safeForSensitiveOperations).toBe(false);
  });
});

describe('selectSavedEnvironment', () => {
  const environments = [
    {
      id: 'env-1',
      name: 'Projeto Local',
      gitWorkspacePath: '/repo/git',
      svnCheckoutPath: '/repo/svn',
      lastValidationStatus: 'ready' as const,
      lastValidatedAt: '2026-06-12T11:30:00.000Z'
    }
  ];

  it('seleciona ambiente e retorna caminhos para o fluxo', () => {
    const result = selectSavedEnvironment({
      environmentId: 'env-1',
      environments,
      now: '2026-06-12T12:00:00.000Z'
    });

    expect(result.selectedEnvironment).toEqual({
      id: 'env-1',
      name: 'Projeto Local',
      gitWorkspacePath: '/repo/git',
      svnCheckoutPath: '/repo/svn'
    });
    expect(result.needsRevalidation).toBe(true);
    expect(result.safeForSensitiveOperations).toBe(false);
  });

  it('retorna mensagem quando ambiente não existe', () => {
    const result = selectSavedEnvironment({
      environmentId: 'env-x',
      environments
    });

    expect(result.selectedEnvironment).toBeUndefined();
    expect(result.message).toContain('não encontrado');
    expect(result.needsRevalidation).toBe(true);
    expect(result.safeForSensitiveOperations).toBe(false);
  });
});