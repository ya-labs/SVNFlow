export type MiniPrRequiredField = 'title' | 'context' | 'whatChanged';

export interface MiniPrDraft {
  title: string;
  context: string;
  whatChanged: string;
  notes: string;
}

export interface MiniPrValidation {
  isValid: boolean;
  message: string;
  pendingRequiredFields: MiniPrRequiredField[];
}

export interface MiniPrTechnicalData {
  environmentName: string;
  branch?: string;
  baseBranch: string;
  author?: string;
  generatedAt: string;
  files: Array<{ path: string; status: string; previousPath?: string }>;
}

const REQUIRED_FIELD_LABELS: Record<MiniPrRequiredField, string> = {
  title: 'título',
  context: 'contexto',
  whatChanged: 'o que mudou'
};

const NOT_INFORMED = 'Não informado.';

export function normalizeMiniPrDraft(draft?: Partial<MiniPrDraft>): MiniPrDraft {
  return {
    title: draft?.title?.trim() ?? '',
    context: draft?.context?.trim() ?? '',
    whatChanged: draft?.whatChanged?.trim() ?? '',
    notes: draft?.notes?.trim() ?? ''
  };
}

export function validateMiniPrDraft(draft: MiniPrDraft): MiniPrValidation {
  const pendingRequiredFields = (Object.keys(REQUIRED_FIELD_LABELS) as MiniPrRequiredField[])
    .filter((field) => draft[field].length === 0);

  if (pendingRequiredFields.length > 0) {
    const labels = pendingRequiredFields.map((field) => REQUIRED_FIELD_LABELS[field]).join(', ');

    return {
      isValid: false,
      message: `Preencha os campos obrigatórios da mini PR: ${labels}.`,
      pendingRequiredFields
    };
  }

  return {
    isValid: true,
    message: 'Mini PR pronta para gerar o pr.md.',
    pendingRequiredFields: []
  };
}

function toBulletLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, ''))
    .filter((line) => line.length > 0)
    .map((line) => `- ${line}`);
}

export function buildMiniPrMarkdown(draft: MiniPrDraft, technical: MiniPrTechnicalData): string {
  const files = technical.files.map(
    (file) => `- **${file.status}** ${file.path}${file.previousPath ? ` (antes: ${file.previousPath})` : ''}`
  );

  return [
    `# ${draft.title}`,
    '',
    `- Ambiente: ${technical.environmentName}`,
    `- Branch: ${technical.branch ?? 'não identificada'}`,
    `- Base: ${technical.baseBranch}`,
    `- Autor: ${technical.author ?? 'não informado'}`,
    `- Arquivos afetados: ${technical.files.length}`,
    `- Gerado em: ${technical.generatedAt}`,
    '',
    '## Contexto',
    '',
    draft.context,
    '',
    '## O que mudou',
    '',
    ...toBulletLines(draft.whatChanged),
    '',
    '## Arquivos afetados',
    '',
    ...files,
    '',
    '## Observações',
    '',
    draft.notes || NOT_INFORMED,
    ''
  ].join('\n');
}
