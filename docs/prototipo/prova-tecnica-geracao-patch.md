# Prova Técnica: Geração de Patch

## Objetivo

Documentar a prova técnica de geração do `patch.diff` usado pelo pacote `.svnflow`.

Esta prova valida, em ambiente fictício, se uma alteração preparada em uma branch Git pode ser transformada em um patch revisável, transportável e adequado para testes posteriores de aplicação em um checkout SVN.

Este documento não define implementação final, stack, interface ou arquitetura do app desktop.

## Relação com a v1

Na v1, o SVNFlow deve gerar um pacote `.svnflow` contendo:

- `pr.md`;
- `manifest.json`;
- `patch.diff`;
- pasta `files/` reservada para cenários futuros.

Esta prova cobre apenas a geração do `patch.diff`.

A validação de pacote `.svnflow`, aplicação do patch em checkout SVN e atualização pelo SVN ficam em outras etapas.

## Cenário Fictício

A prova deve usar um repositório Git local fictício, sem código corporativo real.

Estrutura inicial sugerida:

```text
projeto-ficticio/
|-- docs/
|   |-- arquivo-alterado.txt
|   |-- arquivo-removido.txt
|   `-- leitura.md
`-- src/
    `-- modulo-exemplo.txt
```

Branch base:

```text
main
```

Branch de origem:

```text
feature/exemplo-geracao-patch
```

Alterações mínimas da branch de origem:

- modificar `docs/arquivo-alterado.txt`;
- criar `docs/arquivo-criado.txt`;
- remover `docs/arquivo-removido.txt`;
- modificar `src/modulo-exemplo.txt`.

## Entradas da Prova

| Entrada | Valor esperado |
| --- | --- |
| Repositório Git | projeto fictício local |
| Branch de origem | `feature/exemplo-geracao-patch` |
| Base de comparação | `main` |
| Arquivos alterados | criados, modificados e removidos |
| Saída técnica | `patch.diff` |

## Comandos Candidatos

Os comandos abaixo servem como referência para a prova técnica. Eles não representam decisão final de implementação.

Identificar branch atual:

```bash
git branch --show-current
```

Listar arquivos alterados em relação à base:

```bash
git diff --name-status main...HEAD
```

Gerar patch com metadados úteis para revisão e aplicação:

```bash
git diff --binary --full-index --find-renames main...HEAD > patch.diff
```

Validar se o patch foi gerado:

```bash
test -s patch.diff
```

Pré-validar encaixe técnico em uma cópia compatível do repositório:

```bash
git apply --check patch.diff
```

## Saída Esperada

A prova deve produzir um arquivo `patch.diff` contendo:

- cabeçalhos `diff --git` para cada arquivo afetado;
- indicação de arquivo criado, quando houver;
- indicação de arquivo removido, quando houver;
- trechos de linhas removidas e adicionadas;
- metadados suficientes para revisão técnica;
- representação adequada para arquivos texto.

Exemplo conceitual de trechos esperados:

```diff
diff --git a/docs/arquivo-alterado.txt b/docs/arquivo-alterado.txt
index 0000000..1111111 100644
--- a/docs/arquivo-alterado.txt
+++ b/docs/arquivo-alterado.txt
@@ -1 +1 @@
-conteúdo anterior
+conteúdo atualizado
```

O conteúdo acima é fictício e serve apenas para demonstrar o formato esperado.

## Critérios Para Considerar o Patch Revisável

O patch gerado será considerado revisável quando:

- a branch de origem for identificada;
- a base de comparação for identificada;
- a lista de arquivos alterados bater com a prévia da exportação;
- o arquivo `patch.diff` não estiver vazio;
- arquivos criados, modificados e removidos aparecerem de forma clara;
- o conteúdo puder ser lido em revisão textual;
- a pré-validação com `git apply --check` passar em uma base compatível;
- não houver conteúdo real, interno ou sensível no cenário da prova.

## Falhas e Limites Esperados

| Situação | Comportamento esperado |
| --- | --- |
| Branch de origem não detectada | bloquear geração do patch |
| Base de comparação inexistente | bloquear geração do patch |
| Nenhuma alteração encontrada | bloquear geração do pacote |
| Patch vazio | tratar como falha |
| Arquivo binário | registrar limite e avaliar tratamento posterior |
| Diferenças de fim de linha | registrar ruído observado |
| Encoding inesperado | registrar se o patch continua legível e aplicável |
| Renomeação ambígua | registrar se o Git detectou como rename ou delete/add |

## Observações Sobre Encoding e Fim de Linha

A prova deve observar se alterações de encoding ou fim de linha geram ruído excessivo no patch.

Pontos a registrar durante a execução:

- se arquivos com acentos permanecem legíveis;
- se alterações de CRLF/LF aparecem como mudança total do arquivo;
- se o patch continua aplicável em uma base compatível;
- se será necessário orientar configuração de `core.autocrlf` em documentação futura.

Nenhuma regra final sobre encoding ou fim de linha deve ser decidida nesta prova sem evidência.

## Fora de Escopo

Esta prova não cobre:

- criação completa do pacote `.svnflow`;
- geração do `manifest.json`;
- geração do `pr.md`;
- aplicação do patch em checkout SVN;
- execução de `svn status`;
- execução de `svn update`;
- commit SVN;
- resolução automática de conflitos;
- escolha de biblioteca, linguagem ou framework.

## Resultado Esperado da Issue

Ao concluir a issue #28, o projeto deve ter:

- cenário fictício de geração de patch documentado;
- comandos candidatos registrados;
- saída esperada definida;
- critérios de revisão do patch definidos;
- falhas e limites iniciais registrados;
- base suficiente para iniciar a issue #29, sobre aplicação do patch.
