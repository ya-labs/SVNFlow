import { execSync } from 'child_process';
import { validateSvnAvailability, validateSvnCheckout } from '../svn';

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

describe('validateSvnCheckout', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when checkout is valid', () => {
    it('should return valid=true with checkout root', () => {
      mockExecSync.mockReturnValue('/home/user/repo');

      const result = validateSvnCheckout('/home/user/repo');

      expect(result.valid).toBe(true);
      expect(result.path).toBe('/home/user/repo');
      expect(result.checkoutRoot).toBe('/home/user/repo');
      expect(result.message).toContain('Checkout SVN válido');
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

      const result = validateSvnCheckout('/nonexistent/path');

      expect(result.valid).toBe(false);
      expect(result.path).toBe('/nonexistent/path');
      expect(result.error).toBe('ENOENT');
      expect(result.message).toContain('SVN não encontrado');
    });
  });

  describe('when folder is not an SVN checkout', () => {
    it('should return valid=false when svn info fails', () => {
      const error = new Error('Not a working copy');
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateSvnCheckout('/tmp');

      expect(result.valid).toBe(false);
      expect(result.path).toBe('/tmp');
      expect(result.error).toBe('Not a working copy');
      expect(result.message).toContain('não é um checkout SVN válido');
    });
  });

  describe('when SVN command times out', () => {
    it('should return valid=false with ETIMEDOUT error', () => {
      const error = new Error('Timeout');
      (error as any).code = 'ETIMEDOUT';
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const result = validateSvnCheckout('/home/user/repo');

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

      const result = validateSvnCheckout('/home/user/repo');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('UNKNOWN_ERROR');
      expect(result.message).toContain('desconhecido');
    });
  });

  describe('return type structure', () => {
    it('should always have valid, message, and path properties', () => {
      mockExecSync.mockReturnValue('/home/user/repo');

      const result = validateSvnCheckout('/home/user/repo');

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('path');
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });
  });
});