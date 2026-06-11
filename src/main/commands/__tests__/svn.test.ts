import { execSync } from 'child_process';
import { validateSvnAvailability } from '../svn';

jest.mock('child_process');

describe('validateSvnAvailability', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when SVN is available', () => {
    it('should return available=true with version', () => {
      mockExecSync.mockReturnValue('1.14.2');

      const result = validateSvnAvailability();

      expect(result.available).toBe(true);
      expect(result.version).toBe('1.14.2');
      expect(result.message).toContain('SVN disponível');
      expect(result.error).toBeUndefined();
    });
  });

  describe('when SVN is not installed', () => {
    it('should return available=false with ENOENT error', () => {
      const error = new Error('Command not found');
      (error as any).code = 'ENOENT';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateSvnAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('ENOENT');
      expect(result.message).toContain('não encontrado');
      expect(result.message).toContain('SVN está instalado');
    });
  });

  describe('when SVN command times out', () => {
    it('should return available=false with ETIMEDOUT error', () => {
      const error = new Error('Timeout');
      (error as any).code = 'ETIMEDOUT';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateSvnAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('ETIMEDOUT');
      expect(result.message).toContain('Timeout');
    });
  });

  describe('when SVN returns an unexpected error', () => {
    it('should return available=false with error message', () => {
      const error = new Error('Permission denied');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateSvnAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(result.message).toContain('Erro ao validar SVN');
    });
  });

  describe('when an unknown error occurs', () => {
    it('should handle non-Error exceptions gracefully', () => {
      mockExecSync.mockImplementation(() => {
        throw 'unknown string error';
      });

      const result = validateSvnAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe('UNKNOWN_ERROR');
      expect(result.message).toContain('desconhecido');
    });
  });
});