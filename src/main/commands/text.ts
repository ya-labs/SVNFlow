// Concordância de número nas mensagens: escolhe a forma pela quantidade.
export function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

// Quantidade seguida da palavra concordada: "1 arquivo", "3 arquivos".
export function count(value: number, singular: string, pluralForm: string): string {
  return `${value} ${plural(value, singular, pluralForm)}`;
}
