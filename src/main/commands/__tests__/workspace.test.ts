import { execSync } from 'child_process';
import { readGitWorkspaceState } from '../workspace';

jest.mock('child_process');

describe('readGitWorkspaceState', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna estado pronto com branch atual e base padrão', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('branch --show-current')) {
        return 'feature/workspace';
      }

      if (command.includes('status --porcelain')) {
        return '';
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    const result = readGitWorkspaceState({
      gitRepositoryPath: '/repo/git'
    });

    expect(result.status).toBe('ready');
    expect(result.branch).toBe('feature/workspace');
    expect(result.baseBranch).toBe('main');
    expect(result.detachedHead).toBe(false);
    expect(result.hasChanges).toBe(false);
  });

  it('retorna base informada quando uma base customizada é usada', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('branch --show-current')) {
        return 'feature/workspace';
      }

      if (command.includes('status --porcelain')) {
        return ' M src/app.ts';
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    const result = readGitWorkspaceState({
      gitRepositoryPath: '/repo/git',
      baseBranch: 'develop'
    });

    expect(result.status).toBe('ready');
    expect(result.baseBranch).toBe('develop');
    expect(result.hasChanges).toBe(true);
  });

  it('bloqueia quando o repositório está em detached HEAD', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('branch --show-current')) {
        return '';
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    const result = readGitWorkspaceState({
      gitRepositoryPath: '/repo/git'
    });

    expect(result.status).toBe('blocked');
    expect(result.detachedHead).toBe(true);
    expect(result.error).toBe('DETACHED_HEAD');
    expect(result.message).toContain('detached HEAD');
  });

  it('retorna erro quando a leitura do estado Git falha', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('branch --show-current')) {
        return 'feature/workspace';
      }

      if (command.includes('status --porcelain')) {
        throw new Error('Permission denied');
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    const result = readGitWorkspaceState({
      gitRepositoryPath: '/repo/git'
    });

    expect(result.status).toBe('error');
    expect(result.error).toBe('Permission denied');
    expect(result.message).toContain('Falha ao validar workspace Git');
  });

  it('retorna erro de timeout quando o comando Git excede o limite', () => {
    const error = new Error('Timeout');
    (error as NodeJS.ErrnoException).code = 'ETIMEDOUT';

    mockExecSync.mockImplementation(() => {
      throw error;
    });

    const result = readGitWorkspaceState({
      gitRepositoryPath: '/repo/git'
    });

    expect(result.status).toBe('error');
    expect(result.error).toBe('ETIMEDOUT');
    expect(result.message).toContain('Timeout');
  });
});
