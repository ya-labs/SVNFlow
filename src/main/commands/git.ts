import { execSync } from 'child_process';

export interface GitValidationResult {
  available: boolean;
  message: string;
  version?: string;
  error?: string;
}

export interface GitRepositoryValidationResult {
  valid: boolean;
  message: string;
  path?: string;
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

export function validateGitRepository(path: string): GitRepositoryValidationResult {
  try {
    execSync(`git -C "${path}" rev-parse --git-dir`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return {
      valid: true,
      message: `Repositório Git válido em ${path}`,
      path
    };
  } catch (error) {
    if (error instanceof Error) {
      // Check for specific error types
      if ('code' in error && error.code === 'ENOENT') {
        return {
          valid: false,
          message: 'Caminho não existe ou não é um repositório Git.',
          path,
          error: 'ENOENT'
        };
      }

      if ('code' in error && error.code === 'ETIMEDOUT') {
        return {
          valid: false,
          message: 'Timeout ao validar repositório Git (limite de 5 segundos excedido).',
          path,
          error: 'ETIMEDOUT'
        };
      }

      return {
        valid: false,
        message: `Caminho não é um repositório Git válido: ${error.message}`,
        path,
        error: error.message
      };
    }

    return {
      valid: false,
      message: 'Erro desconhecido ao validar repositório Git.',
      path,
      error: 'UNKNOWN_ERROR'
    };
  }
}
