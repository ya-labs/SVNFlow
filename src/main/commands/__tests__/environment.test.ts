import { execSync } from 'child_process';
import { validateEnvironmentState } from '../environment';

jest.mock('child_process');

describe('validateEnvironmentState', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockReadyCommands() {
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('git --version')) {
        return 'git version 2.40.0';
      }

      if (command.includes('svn --version --quiet')) {
        return '1.14.2';
      }

      if (command.includes('rev-parse --git-dir')) {
        return '.git';
      }

      if (command.includes('branch --show-current')) {
        return 'feature/estado-ambiente';
      }

      if (command.includes('rev-parse --verify')) {
        return 'main';
      }

      if (command.includes('diff --name-status')) {
        return '';
      }

      if (command.includes('svn info --show-item wc-root')) {
        return '/home/user/svn-checkout';
      }

      throw new Error(`Unexpected command: ${command}`);
    });
  }

  it('should return ready when all validations pass', () => {
    mockReadyCommands();

    const result = validateEnvironmentState({
      gitRepositoryPath: '/home/user/git-repo',
      svnCheckoutPath: '/home/user/svn-checkout'
    });

    expect(result.status).toBe('ready');
    expect(result.message).toContain('Ambiente pronto');
    expect(result.git.availability.status).toBe('ready');
    expect(result.git.repository.status).toBe('ready');
    expect(result.git.workspace.status).toBe('ready');
    expect(result.git.workspace.branch).toBe('feature/estado-ambiente');
    expect(result.git.workspace.hasChanges).toBe(false);
    expect(result.git.workspace.changedFiles).toEqual([]);
    expect(result.svn.availability.status).toBe('ready');
    expect(result.svn.checkout.status).toBe('ready');
  });

  it('should return blocked when Git workspace is detached HEAD', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('git --version')) {
        return 'git version 2.40.0';
      }

      if (command.includes('svn --version --quiet')) {
        return '1.14.2';
      }

      if (command.includes('rev-parse --git-dir')) {
        return '.git';
      }

      if (command.includes('branch --show-current')) {
        return '';
      }

      if (command.includes('svn info --show-item wc-root')) {
        return '/home/user/svn-checkout';
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    const result = validateEnvironmentState({
      gitRepositoryPath: '/home/user/git-repo',
      svnCheckoutPath: '/home/user/svn-checkout'
    });

    expect(result.status).toBe('blocked');
    expect(result.git.workspace.status).toBe('blocked');
    expect(result.git.workspace.error).toBe('DETACHED_HEAD');
    expect(result.message).toContain('detached HEAD');
  });

  it('should return blocked when checkout is invalid', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('git --version')) {
        return 'git version 2.40.0';
      }

      if (command.includes('svn --version --quiet')) {
        return '1.14.2';
      }

      if (command.includes('rev-parse --git-dir')) {
        return '.git';
      }

      if (command.includes('branch --show-current')) {
        return 'feature/estado-ambiente';
      }

      if (command.includes('rev-parse --verify')) {
        return 'main';
      }

      if (command.includes('diff --name-status')) {
        return '';
      }

      if (command.includes('svn info --show-item wc-root')) {
        const error = new Error('Not a working copy');
        (error as any).code = 'ENOENT';
        throw error;
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    const result = validateEnvironmentState({
      gitRepositoryPath: '/home/user/git-repo',
      svnCheckoutPath: '/home/user/not-checkout'
    });

    expect(result.status).toBe('blocked');
    expect(result.svn.checkout.status).toBe('blocked');
    expect(result.svn.checkout.error).toBe('ENOENT');
    expect(result.message).toContain('SVN não encontrado');
  });

  it('should return error when workspace validation fails unexpectedly', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('git --version')) {
        return 'git version 2.40.0';
      }

      if (command.includes('svn --version --quiet')) {
        return '1.14.2';
      }

      if (command.includes('rev-parse --git-dir')) {
        return '.git';
      }

      if (command.includes('branch --show-current')) {
        return 'feature/estado-ambiente';
      }

      if (command.includes('rev-parse --verify')) {
        return 'main';
      }

      if (command.includes('diff --name-status')) {
        throw new Error('Permission denied');
      }

      if (command.includes('svn info --show-item wc-root')) {
        return '/home/user/svn-checkout';
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    const result = validateEnvironmentState({
      gitRepositoryPath: '/home/user/git-repo',
      svnCheckoutPath: '/home/user/svn-checkout'
    });

    expect(result.status).toBe('error');
    expect(result.git.workspace.status).toBe('error');
    expect(result.git.workspace.message).toContain('Falha ao listar arquivos alterados');
  });
});
