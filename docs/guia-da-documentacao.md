# Guia de Consulta da Documentação

## Objetivo

Este documento ajuda a localizar rapidamente onde cada assunto do SVNFlow está documentado.

Use este guia quando precisar entender a estrutura do projeto, encontrar uma decisão, localizar um fluxo ou descobrir qual documento deve ser atualizado.

## Leitura Rápida Recomendada

Para entender o projeto em ordem:

1. [README principal](../README.md)
2. [Mapa do problema](planejamento/00-inicial/mapa-do-problema.md)
3. [Matriz de alternativas](planejamento/00-inicial/matriz-de-alternativas.md)
4. [Decisão de escopo da v1](decisoes/0001-escopo-v1.md)
5. [Guia de documentação para IA](guia-de-documentacao-para-ia.md)
6. [Mapa 01 - Visão Funcional da v1](planejamento/01-v1/01-visao-funcional-v1.md)
7. [Roteiro geral de etapas](planejamento/99-geral/roteiro-geral-de-etapas.md)
8. [Mapa 03 - Provas Técnicas da v1](planejamento/01-v1/03-provas-tecnicas-v1.md)

## Pastas

### `docs/`

Índice geral da documentação do projeto.

Use quando quiser ver a estrutura atual, links principais e regras de segurança da documentação pública.

Documento principal:

- [Documentação do SVNFlow](README.md)
- [Guia de documentação para IA](guia-de-documentacao-para-ia.md)

### `docs/planejamento/00-inicial/`

Guarda documentos de descoberta e entendimento inicial.

Use quando quiser entender por que o SVNFlow existe, quais problemas resolve e quais alternativas foram consideradas.

Documentos:

- [Mapa do problema](planejamento/00-inicial/mapa-do-problema.md)
- [Matriz de alternativas](planejamento/00-inicial/matriz-de-alternativas.md)

### `docs/planejamento/01-v1/`

Guarda mapas de etapas e planejamento da primeira versão.

Use quando quiser saber em que ponto a v1 está e quais etapas vêm depois.

Documentos:

- [Mapa 01 - Visão Funcional da v1](planejamento/01-v1/01-visao-funcional-v1.md)
- [Mapa 02 - Contratos e Validações da v1](planejamento/01-v1/02-contratos-validacoes-v1.md)
- [Mapa 03 - Provas Técnicas da v1](planejamento/01-v1/03-provas-tecnicas-v1.md)

### `docs/planejamento/99-geral/`

Guarda documentos de planejamento transversal, que organizam etapas gerais do projeto.

Use quando quiser entender a sequência planejada de blocos até a conclusão do projeto.

Documentos:

- [Roteiro geral de etapas](planejamento/99-geral/roteiro-geral-de-etapas.md)

### `docs/decisoes/`

Guarda decisões registradas do projeto.

Use quando quiser entender o que já foi escolhido, por que foi escolhido e quais consequências foram aceitas.

Documentos:

- [Decisão 0001: Escopo da v1](decisoes/0001-escopo-v1.md)
- [Decisão 0002: Contrato inicial do pacote `.svnflow`](decisoes/0002-contrato-inicial-pacote-svnflow.md)
- [Decisão 0003: Commit SVN protegido](decisoes/0003-commit-svn-protegido.md)

### `docs/fluxos/`

Guarda fluxos funcionais do produto.

Use quando quiser entender como uma pessoa usuária deve executar uma tarefa no SVNFlow.

Documentos:

- [Pacote `.svnflow`](fluxos/pacote-svnflow.md)
- [Exportação de alteração](fluxos/exportacao-alteracao.md)
- [Importação de alteração](fluxos/importacao-alteracao.md)
- [Aplicação do patch no checkout SVN](fluxos/aplicacao-patch-svn.md)
- [Histórico local de pacotes](fluxos/historico-local-pacotes.md)
- [Atualização da base local a partir do SVN](fluxos/atualizacao-base-local-svn.md)

### `docs/contratos/`

Guarda contratos operacionais.

Use quando quiser entender entradas, saídas, confirmações, falhas esperadas e bloqueios de cada operação.

Documentos:

- [Contratos operacionais dos comandos da v1](contratos/operacoes-v1.md)

### `docs/prototipo/`

Guarda planejamento de protótipos.

Use quando quiser entender o que precisa ser validado antes da implementação real.

Documentos:

- [Plano do protótipo técnico da v1](prototipo/plano-prototipo-v1.md)
- [Prova técnica: Geração de Patch](prototipo/prova-tecnica-geracao-patch.md)

## Documentos da Raiz

### `README.md`

Apresenta o projeto, visão geral, estado atual, segurança, links principais e fluxo de trabalho.

Use como porta de entrada pública do repositório.

### `AGENTS.md`

Define instruções para assistentes de IA trabalharem no repositório.

Use para orientar análise, edição, commits e PRs mantendo o padrão da YA LABS.

## Onde Atualizar Cada Tipo de Informação

| Tipo de informação | Onde atualizar |
| --- | --- |
| Visão geral do projeto | `README.md` |
| Regras para IA | `AGENTS.md` |
| Consulta e manutenção documental pela IA | `docs/guia-de-documentacao-para-ia.md` |
| Problema, contexto e alternativas | `docs/planejamento/00-inicial/` |
| Mapas de etapas da v1 | `docs/planejamento/01-v1/` |
| Planejamento transversal | `docs/planejamento/99-geral/` |
| Decisões aceitas | `docs/decisoes/` |
| Fluxos de uso | `docs/fluxos/` |
| Contratos operacionais | `docs/contratos/` |
| Protótipos e provas técnicas | `docs/prototipo/` |

## Quando Atualizar Índices e Guias

Nem toda alteração documental exige atualizar todos os índices.

Atualize sempre:

- o documento principal da tarefa;
- o mapa em andamento, quando houver mudança de status documental da etapa ou documento relacionado.

Atualize este guia quando:

- criar uma nova pasta ou categoria;
- mudar a função de uma pasta;
- mover, renomear ou remover documento importante para consulta humana;
- a pessoa leitora puder ter dificuldade para encontrar o conteúdo depois.

Atualize o `docs/guia-de-documentacao-para-ia.md` quando:

- mudar regra de manutenção documental;
- mudar fluxo de consulta da IA;
- mudar o papel de uma pasta ou documento;
- surgir um padrão novo que a IA deve repetir.

Se a alteração for pequena e localizada, prefira não mexer em índices que não agregam navegação real.

## Regras de Segurança

Esta documentação é pública.

Não inclua:

- código corporativo real;
- nomes de empresas, clientes ou projetos internos;
- URLs privadas;
- caminhos locais de ambientes reais;
- credenciais;
- trechos sensíveis de arquivos.

Use exemplos genéricos e linguagem preventiva.

## Padrão dos Mapas de Planejamento

Cada mapa oficial deve ficar como arquivo Markdown direto dentro da área correspondente.

Exemplo:

```text
docs/planejamento/01-v1/01-visao-funcional-v1.md
```

Cada mapa deve conter:

- resumo;
- trilha textual fixa;
- tabela de rastreabilidade;
- objetivo;
- critérios;
- etapas e status;
- próxima etapa do mapa, apenas quando o mapa estiver em andamento.

Mapas concluídos devem permanecer estáticos e não devem registrar andamento de issues futuras. O GitHub Project e as issues controlam execução; os documentos registram conhecimento durável.

## Fluxo GitHub

Toda issue nova do SVNFlow deve ser vinculada ao Project `ya labs development`, além de seguir o fluxo normal da YA LABS:

- label adequada;
- assignee;
- branch correspondente;
- Pull Request com `Closes #<issue>`.
