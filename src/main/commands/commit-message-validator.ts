export type CommitMessageValidationStatus = 'valid' | 'incomplete' | 'invalid';

export interface CommitMessageValidation {
  isValid: boolean;
  status: CommitMessageValidationStatus;
  message: string;
  suggestions: string[];
  errorCode?: string;
}

export interface CommitMessageInput {
  title?: string;
  description?: string;
  context?: string;
}

function validateTitle(title: string | undefined): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Título é obrigatório.' };
  }

  if (title.trim().length < 10) {
    return { valid: false, error: 'Título muito curto (mínimo 10 caracteres).' };
  }

  if (title.trim().length > 72) {
    return { valid: false, error: 'Título muito longo (máximo 72 caracteres).' };
  }

  if (!/^[A-Z]/.test(title.trim())) {
    return { valid: false, error: 'Título deve começar com letra maiúscula.' };
  }

  if (!/[.!?]$/.test(title.trim())) {
    return { valid: false, error: 'Título deve terminar com ponto, exclamação ou interrogação.' };
  }

  return { valid: true };
}

function suggestTitle(input: CommitMessageInput): string[] {
  const suggestions: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    suggestions.push('Forneça um título descritivo da alteração.');
    if (input.context) {
      suggestions.push(`Exemplo: "Correção de ${input.context}".`);
    }
  }

  if (input.title && input.title.trim().length < 10) {
    suggestions.push(`Expanda o título para descrever melhor a alteração (atual: ${input.title.trim().length} caracteres).`);
  }

  if (input.title && input.title.trim().length > 72) {
    suggestions.push(`Reduza o título para no máximo 72 caracteres (atual: ${input.title.trim().length}).`);
  }

  if (input.title && !/^[A-Z]/.test(input.title.trim())) {
    suggestions.push('Comece o título com letra maiúscula.');
  }

  if (input.title && !/[.!?]$/.test(input.title.trim())) {
    suggestions.push('Termine o título com ponto, exclamação ou interrogação.');
  }

  return suggestions;
}

export function validateCommitMessage(input: CommitMessageInput): CommitMessageValidation {
  const titleValidation = validateTitle(input.title);

  if (!titleValidation.valid) {
    const suggestions = suggestTitle(input);
    return {
      isValid: false,
      status: 'incomplete',
      message: titleValidation.error || 'Mensagem inválida.',
      suggestions,
      errorCode: 'INVALID_TITLE'
    };
  }

  // Se título está OK, validar descrição opcional
  if (input.description && input.description.trim().length > 0) {
    if (input.description.trim().length < 20) {
      return {
        isValid: false,
        status: 'incomplete',
        message: 'Descrição muito curta (mínimo 20 caracteres para conteúdo significativo).',
        suggestions: ['Expanda a descrição ou deixe-a vazia se o título for suficiente.'],
        errorCode: 'INCOMPLETE_DESCRIPTION'
      };
    }

    if (input.description.trim().length > 500) {
      return {
        isValid: false,
        status: 'invalid',
        message: 'Descrição muito longa (máximo 500 caracteres).',
        suggestions: ['Resuma a descrição ou divida em múltiplos commits.'],
        errorCode: 'DESCRIPTION_TOO_LONG'
      };
    }
  }

  return {
    isValid: true,
    status: 'valid',
    message: 'Mensagem de commit válida.',
    suggestions: input.description ? [] : ['Considere adicionar uma breve descrição das alterações.']
  };
}

export function suggestCommitMessage(input: CommitMessageInput): string {
  if (!input.title || input.title.trim().length === 0) {
    return 'Forneça um título descritivo.';
  }

  let suggested = input.title.trim();

  if (!/^[A-Z]/.test(suggested)) {
    suggested = suggested.charAt(0).toUpperCase() + suggested.slice(1);
  }

  if (!/[.!?]$/.test(suggested)) {
    suggested += '.';
  }

  return suggested;
}
