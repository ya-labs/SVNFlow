import { execSync } from 'child_process';
import { validateGitAvailability, validateGitRepository, GitValidationResult } from '../git';

jest.mock('child_process');

describe('validateGitAvailability', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when Git is available', () => {
    it('should return available=true with version', () => {
      mockExecSync.mockReturnValue('git version 2.40.0');

      const result = validateGitAvailability();

      expect(result.available).toBe(true);
      expect(result.version).toBe('2.40.0');
      expect(result.message).toContain('Git disponível');
      expect(result.error).toBeUndefined();
    });

    it('should extract version correctly from various git outputs', () => {
      mockExecSync.mockReturnValue('git version 2.45.1 (some-details)');

      const result = validateGitAvailability();

      expect(result.version).toBe('2.45.1 (some-details)');
    });
  });

  describe('when Git is not installed', () => {
    it('should return available=false with ENOENT error', () => {
      const error = new Error('Command not found');
      (error as any).code = 'ENOENT';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateGitAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('ENOENT');
      expect(result.message).toContain('não encontrado');
      expect(result.message).toContain('Git está instalado');
    });
  });

  describe('when Git command times out', () => {
    it('should return available=false with ETIMEDOUT error', () => {
      const error = new Error('Timeout');
      (error as any).code = 'ETIMEDOUT';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateGitAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('ETIMEDOUT');
      expect(result.message).toContain('Timeout');
    });
  });

  describe('when Git returns an unexpected error', () => {
    it('should return available=false with error message', () => {
      const error = new Error('Permission denied');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateGitAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(result.message).toContain('Erro ao validar Git');
    });
  });

  describe('when an unknown error occurs', () => {
    it('should handle non-Error exceptions gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw 'unknown string error';
      });

      const result = validateGitAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('UNKNOWN_ERROR');
      expect(result.message).toContain('desconhecido');
    });
  });

  describe('return type structure', () => {
    it('should always have available, message, and optional fields', () => {
      mockExecSync.mockReturnValue('git version 2.40.0');

      const result = validateGitAvailability();

      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('message');
      expect(typeof result.available).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });
  });
});

describe('validateGitRepository', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when repository is valid', () => {
    it('should return valid=true with path', () => {
      mockExecSync.mockReturnValue('.git');

      const result = validateGitRepository('/home/user/my-repo');

      expect(result.valid).toBe(true);
      expect(result.path).toBe('/home/user/my-repo');
      expect(result.message).toContain('Repositório Git válido');
      expect(result.error).toBeUndefined();
    });
  });

  describe('when path does not exist', () => {
    it('should return valid=false with ENOENT error', () => {
      const error = new Error('No such file or directory');
      (error as any).code = 'ENOENT';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateGitRepository('/nonexistent/path');

      expect(result.valid).toBe(false);
      expect(result.path).toBe('/nonexistent/path');
      expect(result.error).toBe('ENOENT');
      expect(result.message).toContain('não existe');
    });
  });

  describe('when folder is not a Git repository', () => {
    it('should return valid=false when rev-parse fails', () => {
      const error = new Error('Not a git repository');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateGitRepository('/tmp');

      expect(result.valid).toBe(false);
      expect(result.path).toBe('/tmp');
      expect(result.error).toBe('Not a git repository');
      expect(result.message).toContain('não é um repositório Git válido');
    });
  });

  describe('when Git command times out', () => {
    it('should return valid=false with ETIMEDOUT error', () => {
      const error = new Error('Timeout');
      (error as any).code = 'ETIMEDOUT';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateGitRepository('/home/user/repo');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('ETIMEDOUT');
      expect(result.message).toContain('Timeout');
    });
  });

  describe('when an unknown error occurs', () => {
    it('should handle non-Error exceptions gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw 'unknown string error';
      });

      const result = validateGitRepository('/home/user/repo');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('UNKNOWN_ERROR');
      expect(result.message).toContain('desconhecido');
    });
  });

  describe('return type structure', () => {
    it('should always have valid, message, and path properties', () => {
      mockExecSync.mockReturnValue('.git');

      const result = validateGitRepository('/home/user/repo');

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('path');
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });
  });
});
