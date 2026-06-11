import { execSync } from 'child_process';
import { validateGitAvailability, GitValidationResult } from '../git';

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
