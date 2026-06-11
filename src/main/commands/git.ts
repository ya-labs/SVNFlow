import { execSync } from 'child_process';

export interface GitValidationResult {
  available: boolean;
  message: string;
  version?: string;
  error?: string;
}

export function validateGitAvailability(): GitValidationResult {
  try {
    const output = execSync('git --version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // Extract version from output like "git version 2.40.0"
    const versionMatch = output.match(/git version (.+)/);
    const version = versionMatch ? versionMatch[1] : output;

    return {
      available: true,
      message: `Git disponível (versão ${version})`,
      version
    };
  } catch (error) {
    if (error instanceof Error) {
      // Check for specific error types
      if ('code' in error && error.code === 'ENOENT') {
        return {
          available: false,
          message: 'Git não encontrado. Verifique se Git está instalado no sistema.',
          error: 'ENOENT'
        };
      }

      if ('code' in error && error.code === 'ETIMEDOUT') {
        return {
          available: false,
          message: 'Timeout ao validar Git (limite de 5 segundos excedido).',
          error: 'ETIMEDOUT'
        };
      }

      return {
        available: false,
        message: `Erro ao validar Git: ${error.message}`,
        error: error.message
      };
    }

    return {
      available: false,
      message: 'Erro desconhecido ao validar Git.',
      error: 'UNKNOWN_ERROR'
    };
  }
}
