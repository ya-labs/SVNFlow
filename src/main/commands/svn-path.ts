// Alvo local literal: o último @ separa a peg revision no cliente SVN.
// Não aplicar a URLs com revisão explícita, ao diff de um alvo local
// (que já usa o nome literal) nem a outros argumentos do comando.
export function svnLocalTarget(filePath: string): string {
  return filePath.includes('@') ? `${filePath}@` : filePath;
}
