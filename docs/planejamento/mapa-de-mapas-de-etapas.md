# Mapa de Mapas de Etapas do SVNFlow

## Objetivo

Este documento organiza uma estimativa de evolução do SVNFlow até a conclusão do projeto.

Ele não detalha o conteúdo de cada mapa. A intenção é definir uma visão navegável dos grandes blocos de trabalho que podem orientar as próximas issues, branches e Pull Requests.

Este planejamento é ajustável. A ordem, quantidade e escopo dos mapas podem mudar conforme provas técnicas, validações de uso e decisões do projeto.

## Padrão para Mapas de Etapas

Todo mapa de etapas do SVNFlow deve seguir um formato mínimo:

- objetivo do mapa;
- critérios do mapa;
- visão geral das etapas;
- lista de etapas numeradas;
- status de cada etapa;
- saída esperada;
- critério de conclusão;
- documentos relacionados;
- próxima issue recomendada.

Status recomendados:

- `concluída`;
- `documentada`;
- `próxima`;
- `pendente`;
- `bloqueada`;
- `replanejada`.

Um mapa de etapas deve orientar o trabalho, não substituir issues. Cada etapa relevante ainda deve virar issue própria ou fazer parte de uma issue documental de lote quando o escopo for pequeno e relacionado.

## Estimativa de Mapas Até a Conclusão

A estimativa inicial é trabalhar com 7 mapas principais.

```text
1. Mapa de descoberta e visão inicial
2. Mapa documental da v1
3. Mapa de provas técnicas da v1
4. Mapa do protótipo navegável da v1
5. Mapa de implementação desktop da v1
6. Mapa de validação e release experimental
7. Mapa de evolução pós-v1
```

## 1. Mapa de Descoberta e Visão Inicial

Status: `concluída`

Papel:

Organizar o entendimento inicial do problema, alternativas e escopo conceitual do produto.

Documentos atuais relacionados:

- [Mapa do problema](../planejamento-inicial/mapa-do-problema.md)
- [Matriz de alternativas](../planejamento-inicial/matriz-de-alternativas.md)
- [Decisão de escopo da v1](../decisoes/0001-escopo-v1.md)

## 2. Mapa Documental da v1

Status: `em andamento`

Papel:

Consolidar decisões, fluxos, contratos operacionais e limites da v1 antes de implementação.

Documentos atuais relacionados:

- [Mapa de etapas da v1](../planejamento-v1/mapa-de-etapas-v1.md)
- [Próximo bloco de etapas da v1](../planejamento-v1/proximo-bloco-etapas-v1.md)
- [Contratos operacionais dos comandos](../contratos/operacoes-v1.md)
- [Contrato inicial do pacote `.svnflow`](../decisoes/0002-contrato-inicial-pacote-svnflow.md)
- [Commit SVN protegido](../decisoes/0003-commit-svn-protegido.md)

## 3. Mapa de Provas Técnicas da v1

Status: `pendente`

Papel:

Planejar e acompanhar validações práticas em ambiente fictício antes da escolha final de stack e arquitetura.

Este mapa deve cobrir provas como:

- geração de `patch.diff`;
- aplicação de patch em checkout SVN fictício;
- execução de `svn update`;
- comportamento com arquivos criados, modificados, removidos, renomeados e binários;
- limites do histórico local;
- mensagens de falha candidatas para interface.

## 4. Mapa do Protótipo Navegável da v1

Status: `pendente`

Papel:

Planejar a experiência navegável que conecta os principais fluxos da v1.

Este mapa deve orientar telas, estados, confirmações, bloqueios e navegação entre:

- exportação;
- importação;
- prévia;
- aplicação;
- status SVN;
- histórico local;
- atualização pelo SVN;
- commit protegido ou etapa manual assistida.

## 5. Mapa de Implementação Desktop da v1

Status: `pendente`

Papel:

Organizar a implementação do app desktop local depois que as provas técnicas e o protótipo navegável reduzirem os principais riscos.

Este mapa deve ser criado somente quando houver decisão mínima sobre stack, arquitetura e empacotamento.

## 6. Mapa de Validação e Release Experimental

Status: `pendente`

Papel:

Organizar validação da v1 em ambiente controlado, ainda sem código corporativo real no repositório público.

Este mapa deve cobrir critérios de pronto, empacotamento experimental, testes em cenário fictício, limitações conhecidas e preparação de release.

## 7. Mapa de Evolução Pós-v1

Status: `pendente`

Papel:

Registrar melhorias futuras depois que a v1 estiver validada.

Possíveis temas:

- suporte ampliado a arquivos binários;
- integração opcional com `git svn`;
- melhorias de colaboração;
- histórico local mais completo;
- templates de mensagem;
- automações adicionais com confirmação explícita.

## Como Usar Este Documento

Este documento deve ser usado como índice de planejamento.

Quando um bloco começar, crie ou atualize o mapa específico daquele bloco. Quando uma prova técnica ou decisão mudar a direção do projeto, atualize este mapa para manter a estimativa realista.

Não é necessário criar todos os mapas de uma vez. Crie o próximo mapa apenas quando ele ajudar a orientar issues concretas.

## Próxima Evolução Recomendada

O próximo mapa a ser criado deve ser o mapa de provas técnicas da v1, porque os contratos operacionais já foram documentados e as próximas issues existentes tratam de geração de patch, aplicação de patch e `svn update`.
