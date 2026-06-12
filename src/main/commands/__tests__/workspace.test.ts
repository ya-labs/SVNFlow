import { execSync } from 'child_process';
import { readGitWorkspaceState, validateGitComparisonBase } from '../workspace';

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

      if (command.includes('rev-parse --verify')) {
        return 'main';
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

      if (command.includes('rev-parse --verify')) {
        return 'develop';
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

      if (command.includes('rev-parse --verify')) {
        return 'main';
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

  it('bloqueia a leitura do workspace quando a base de comparação não existe', () => {
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('branch --show-current')) {
        return 'feature/workspace';
      }

      if (command.includes('rev-parse --verify')) {
        const error = new Error('fatal: Needed a single revision');
        (error as Error & { status: number }).status = 128;
        throw error;
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    const result = readGitWorkspaceState({
      gitRepositoryPath: '/repo/git',
      baseBranch: 'release/inexistente'
    });

    expect(result.status).toBe('blocked');
    expect(result.branch).toBe('feature/workspace');
    expect(result.baseBranch).toBe('release/inexistente');
    expect(result.error).toBe('BASE_NOT_FOUND');
    expect(result.message).toContain('não encontrada');
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

describe('validateGitComparisonBase', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aceita uma base existente no repositório local', () => {
    mockExecSync.mockReturnValue('main');

    const result = validateGitComparisonBase({
      gitRepositoryPath: '/repo/git'
    });

    expect(result.status).toBe('ready');
    expect(result.valid).toBe(true);
    expect(result.baseBranch).toBe('main');
    expect(result.message).toContain('encontrada');
  });

  it('usa main como base padrão quando nenhuma base é informada', () => {
    mockExecSync.mockReturnValue('main');

    const result = validateGitComparisonBase({
      gitRepositoryPath: '/repo/git'
    });

    expect(result.baseBranch).toBe('main');
    expect(mockExecSync).toHaveBeenCalledWith(
      'git -C "/repo/git" rev-parse --verify "main"',
      expect.any(Object)
    );
  });

  it('bloqueia quando a base de comparação não existe', () => {
    const error = new Error('fatal: Needed a single revision');
    (error as Error & { status: number }).status = 128;

    mockExecSync.mockImplementation(() => {
      throw error;
    });

    const result = validateGitComparisonBase({
      gitRepositoryPath: '/repo/git',
      baseBranch: 'release/inexistente'
    });

    expect(result.status).toBe('blocked');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('BASE_NOT_FOUND');
    expect(result.message).toContain('não encontrada');
  });

  it('retorna erro quando o comando Git falha de forma inesperada', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const result = validateGitComparisonBase({
      gitRepositoryPath: '/repo/git',
      baseBranch: 'main'
    });

    expect(result.status).toBe('error');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Permission denied');
    expect(result.message).toContain('Falha ao validar base');
  });
});
