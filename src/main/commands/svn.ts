import { execSync } from 'child_process';

export interface SvnValidationResult {
  available: boolean;
  message: string;
  version?: string;
  error?: string;
}

export interface SvnCheckoutValidationResult {
  valid: boolean;
  message: string;
  path?: string;
  checkoutRoot?: string;
  error?: string;
}

export function validateSvnAvailability(): SvnValidationResult {
  try {
    const output = execSync('svn --version --quiet', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    return {
      available: true,
      message: `SVN disponível (versão ${output})`,
      version: output
    };
  } catch (error) {
    if (error instanceof Error) {
      if ('code' in error && error.code === 'ENOENT') {
        return {
          available: false,
          message: 'SVN não encontrado. Verifique se SVN está instalado no sistema.',
          error: 'ENOENT'
        };
      }

      if ('code' in error && error.code === 'ETIMEDOUT') {
        return {
          available: false,
          message: 'Timeout ao validar SVN (limite de 5 segundos excedido).',
          error: 'ETIMEDOUT'
        };
      }

      return {
        available: false,
        message: `Erro ao validar SVN: ${error.message}`,
        error: error.message
      };
    }

    return {
      available: false,
      message: 'Erro desconhecido ao validar SVN.',
      error: 'UNKNOWN_ERROR'
    };
  }
}

export function validateSvnCheckout(path: string): SvnCheckoutValidationResult {
  try {
    const output = execSync(`svn info --show-item wc-root "${path}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    return {
      valid: true,
      message: `Checkout SVN válido em ${path}`,
      path,
      checkoutRoot: output
    };
  } catch (error) {
    if (error instanceof Error) {
      if ('code' in error && error.code === 'ENOENT') {
        return {
          valid: false,
          message: 'SVN não encontrado. Verifique se SVN está instalado no sistema.',
          path,
          error: 'ENOENT'
        };
      }

      if ('code' in error && error.code === 'ETIMEDOUT') {
        return {
          valid: false,
          message: 'Timeout ao validar checkout SVN (limite de 5 segundos excedido).',
          path,
          error: 'ETIMEDOUT'
        };
      }

      return {
        valid: false,
        message: `Caminho não é um checkout SVN válido: ${error.message}`,
        path,
        error: error.message
      };
    }

    return {
      valid: false,
      message: 'Erro desconhecido ao validar checkout SVN.',
      path,
      error: 'UNKNOWN_ERROR'
    };
  }
}