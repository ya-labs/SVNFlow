import { execSync } from 'child_process';

export interface SvnValidationResult {
  available: boolean;
  message: string;
  version?: string;
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