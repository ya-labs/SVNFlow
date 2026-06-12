import { revalidateEnvironment } from '../revalidate-environment';
import { validateEnvironmentState } from '../environment';
import type { SavedEnvironment } from '../saved-environments';

jest.mock('../environment');

const mockValidateEnvironmentState = validateEnvironmentState as jest.MockedFunction<typeof validateEnvironmentState>;

describe('revalidateEnvironment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('valid environment', () => {
    it('should return canAdvance true when environment is valid', () => {
      const environment: SavedEnvironment = {
        id: 'env-001',
        name: 'Projeto Válido',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'ready',
        message: 'Ambiente pronto para leitura e revisão.',
        git: {
          workspace: {
            branch: 'feature/revalidado',
            baseBranch: 'main',
            hasChanges: true,
            changedFiles: []
          }
        } as never,
        svn: {
          checkout: {
            checkoutRoot: '/repo/svn'
          }
        } as never
      });

      const result = revalidateEnvironment({
        environment
      });

      expect(result.canAdvance).toBe(true);
      expect(result.safeForSensitiveOperations).toBe(true);
      expect(result.blockers).toHaveLength(0);
      expect(result.environment).toBeDefined();
      expect(result.environment?.isValid).toBe(true);
    });

    it('should return environment with validation status ready', () => {
      const environment: SavedEnvironment = {
        id: 'env-002',
        name: 'Projeto Validado',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'ready',
        message: 'Ambiente pronto para leitura e revisão.',
        git: {
          workspace: {
            branch: 'feature/revalidado',
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

      const result = revalidateEnvironment({
        environment
      });

      expect(result.environment?.currentValidationStatus).toBe('ready');
      expect(result.environment?.safeForSensitiveOperations).toBe(true);
    });
  });

  describe('invalid environment', () => {
    it('should return canAdvance false when git path is invalid', () => {
      const environment: SavedEnvironment = {
        id: 'env-003',
        name: 'Projeto Inválido',
        gitWorkspacePath: '/path/that/does/not/exist/to/git',
        svnCheckoutPath: '/repo/svn'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'blocked',
        message: 'O caminho informado não é um repositório Git válido.',
        git: {
          workspace: {
            branch: undefined,
            baseBranch: 'main',
            hasChanges: false,
            changedFiles: [],
            error: 'GIT_REPOSITORY_INVALID'
          }
        } as never,
        svn: {
          checkout: {
            checkoutRoot: '/repo/svn'
          }
        } as never
      });

      const result = revalidateEnvironment({
        environment
      });

      expect(result.canAdvance).toBe(false);
      expect(result.safeForSensitiveOperations).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.environment).toBeUndefined();
    });

    it('should return canAdvance false when svn path is invalid', () => {
      const environment: SavedEnvironment = {
        id: 'env-004',
        name: 'Projeto com SVN Inválido',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/path/that/does/not/exist/to/svn'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'blocked',
        message: 'O caminho informado não é um checkout SVN válido.',
        git: {
          workspace: {
            branch: 'feature/revalidado',
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

      const result = revalidateEnvironment({
        environment
      });

      expect(result.canAdvance).toBe(false);
      expect(result.safeForSensitiveOperations).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it('should extract GIT_REPOSITORY_INVALID blocker', () => {
      const environment: SavedEnvironment = {
        id: 'env-005',
        name: 'Sem repositório Git',
        gitWorkspacePath: '/home',
        svnCheckoutPath: '/repo/svn'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'blocked',
        message: 'Caminho não é um repositório Git válido: erro',
        git: {
          workspace: {
            branch: undefined,
            baseBranch: 'main',
            hasChanges: false,
            changedFiles: [],
            error: 'GIT_REPOSITORY_INVALID'
          }
        } as never,
        svn: {
          checkout: {
            checkoutRoot: '/repo/svn'
          }
        } as never
      });

      const result = revalidateEnvironment({
        environment
      });

      const gitInvalidBlocker = result.blockers.find(b => b.code === 'GIT_REPOSITORY_INVALID');
      expect(gitInvalidBlocker).toBeDefined();
      expect(gitInvalidBlocker?.message).toContain('não é um repositório');
    });

    it('should extract SVN_CHECKOUT_INVALID blocker', () => {
      const environment: SavedEnvironment = {
        id: 'env-006',
        name: 'Sem checkout SVN',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/home'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'blocked',
        message: 'Caminho não é um checkout SVN válido: erro',
        git: {
          workspace: {
            branch: 'feature/revalidado',
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

      const result = revalidateEnvironment({
        environment
      });

      const svnInvalidBlocker = result.blockers.find(b => b.code === 'SVN_CHECKOUT_INVALID');
      expect(svnInvalidBlocker).toBeDefined();
      expect(svnInvalidBlocker?.message).toContain('não é um checkout');
    });
  });

  describe('nonexistent paths', () => {
    it('should return canAdvance false for nonexistent git path', () => {
      const environment: SavedEnvironment = {
        id: 'env-007',
        name: 'Git Path Inexistente',
        gitWorkspacePath: '/nonexistent/git/path/2024/06/12',
        svnCheckoutPath: '/repo/svn'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'error',
        message: 'Falha ao validar Git: caminho inexistente',
        git: {
          workspace: {
            branch: undefined,
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

      const result = revalidateEnvironment({
        environment
      });

      expect(result.canAdvance).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should return canAdvance false for nonexistent svn path', () => {
      const environment: SavedEnvironment = {
        id: 'env-008',
        name: 'SVN Path Inexistente',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/nonexistent/svn/path/2024/06/12'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'error',
        message: 'Falha ao validar SVN: caminho inexistente',
        git: {
          workspace: {
            branch: 'feature/revalidado',
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

      const result = revalidateEnvironment({
        environment
      });

      expect(result.canAdvance).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should return canAdvance false when both paths are nonexistent', () => {
      const environment: SavedEnvironment = {
        id: 'env-009',
        name: 'Ambos Caminhos Inexistentes',
        gitWorkspacePath: '/nonexistent/git/2024',
        svnCheckoutPath: '/nonexistent/svn/2024'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'error',
        message: 'Falha ao validar ambiente.',
        git: {
          workspace: {
            branch: undefined,
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

      const result = revalidateEnvironment({
        environment
      });

      expect(result.canAdvance).toBe(false);
      expect(result.blockers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('blockers extraction', () => {
    it('should provide human-readable blockers for blocked environment', () => {
      const environment: SavedEnvironment = {
        id: 'env-010',
        name: 'Ambiente Bloqueado',
        gitWorkspacePath: '/invalid/git',
        svnCheckoutPath: '/invalid/svn'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'blocked',
        message: 'Repositório Git em detached HEAD.',
        git: {
          workspace: {
            branch: undefined,
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

      const result = revalidateEnvironment({
        environment
      });

      expect(result.blockers).toBeDefined();
      expect(Array.isArray(result.blockers)).toBe(true);
      result.blockers.forEach(blocker => {
        expect(blocker.code).toBeDefined();
        expect(blocker.message).toBeDefined();
        expect(blocker.message).toBeTruthy();
      });
    });
  });

  describe('base branch handling', () => {
    it('should accept base branch in input', () => {
      const environment: SavedEnvironment = {
        id: 'env-011',
        name: 'Projeto com Base Branch',
        gitWorkspacePath: '/repo/git',
        svnCheckoutPath: '/repo/svn'
      };

      mockValidateEnvironmentState.mockReturnValue({
        status: 'ready',
        message: 'Ambiente pronto para leitura e revisão.',
        git: {
          workspace: {
            branch: 'feature/base-branch',
            baseBranch: 'develop',
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

      const result = revalidateEnvironment({
        environment,
        baseBranch: 'develop'
      });

      expect(result.canAdvance).toBe(true);
      expect(result.safeForSensitiveOperations).toBe(true);
    });
  });
});
