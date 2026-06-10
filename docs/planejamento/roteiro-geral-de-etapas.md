# Roteiro Geral de Etapas do SVNFlow

## Objetivo

Este documento define um roteiro simples de etapas para orientar o SVNFlow até o fim do projeto.

Ele deve responder, em alto nível:

- quais blocos precisam existir;
- em que ordem os blocos devem ser tratados;
- qual saída cada bloco deve produzir;
- quais mapas ou issues ajudam a detalhar cada bloco.

Este roteiro não deve funcionar como registro de execução diária, histórico de PRs ou painel de status. Esse acompanhamento fica no GitHub, por meio de issues, Pull Requests e Project.

O roteiro pode mudar quando uma decisão ou prova técnica justificar ajuste real de direção, mas não precisa ser reescrito a cada etapa concluída.

Para encontrar pastas, documentos e índices, use o [Guia de Consulta da Documentação](../guia-da-documentacao.md).

## Princípios

O roteiro deve ser:

- simples o suficiente para não duplicar o GitHub;
- estável o suficiente para orientar o projeto até a entrega;
- flexível o suficiente para aceitar replanejamento quando houver evidência;
- genérico o suficiente para não registrar conteúdo corporativo real;
- rastreável por mapas e issues, sem transformar o documento em controle operacional.

## Etapas Planejadas

| Ordem | Etapa | Objetivo | Saída esperada | Referência |
| --- | --- | --- | --- | --- |
| 1 | Descoberta e recorte inicial | Entender o problema, comparar alternativas e definir o recorte público da v1. | Problema, alternativas e decisão inicial documentados. | `docs/planejamento-inicial/`, `docs/decisoes/0001-escopo-v1.md` |
| 2 | Visão funcional da v1 | Organizar os fluxos principais que precisam existir antes de discutir implementação. | Mapa funcional da v1 e fluxos de uso documentados. | [Mapa 01](../planejamento-v1/visao-funcional-v1.md), issue #11 |
| 3 | Contratos e validações da v1 | Definir entradas, saídas, confirmações, bloqueios e limites das operações sensíveis. | Contratos operacionais e mapa de validações documentados. | [Mapa 02](../planejamento-v1/contratos-validacoes-v1.md), issues #25 e #27 |
| 4 | Provas técnicas da v1 | Validar, em ambiente fictício, se os comandos e fluxos centrais funcionam antes da implementação real. | Evidências sobre geração de patch, aplicação de patch, `svn update`, base Git local e histórico local. | [Mapa 03](../planejamento-v1/provas-tecnicas-v1.md), issues #28 a #34 |
| 5 | Protótipo navegável | Representar a experiência principal da v1 com telas, estados, confirmações e bloqueios. | Protótipo revisável da jornada principal. | Issue #33 |
| 6 | Definição técnica da aplicação desktop | Escolher stack, arquitetura mínima, empacotamento e limites de automação com base nas provas. | Decisões técnicas registradas e plano de implementação preparado. | Issue futura |
| 7 | Implementação da v1 | Construir o aplicativo desktop local respeitando os contratos, provas e decisões aceitas. | V1 funcional em cenário fictício, sem conteúdo corporativo real. | Issue futura |
| 8 | Validação e release experimental | Validar a v1 em ambiente controlado e preparar uma entrega experimental segura. | Checklist de pronto, limitações conhecidas e release experimental. | Issue #34 |
| 9 | Evolução pós-v1 | Registrar melhorias futuras depois que a v1 estiver validada. | Backlog pós-v1 separado do escopo inicial. | Issue futura |

## Mapas de Apoio

Os mapas detalham partes específicas do roteiro. Eles podem ter rastreabilidade própria com issues, mas não precisam ser organizados em uma pasta exclusiva para cada arquivo.

| Mapa | Arquivo | Papel |
| --- | --- | --- |
| Mapa 01 - Visão Funcional da v1 | [visao-funcional-v1.md](../planejamento-v1/visao-funcional-v1.md) | Organizar fluxos funcionais e primeiros limites da v1. |
| Mapa 02 - Contratos e Validações da v1 | [contratos-validacoes-v1.md](../planejamento-v1/contratos-validacoes-v1.md) | Conectar fluxos, contratos e validações necessárias antes da implementação. |
| Mapa 03 - Provas Técnicas da v1 | [provas-tecnicas-v1.md](../planejamento-v1/provas-tecnicas-v1.md) | Organizar as provas técnicas que reduzem risco antes da decisão de stack. |

## Uso das Issues

As issues continuam sendo a fonte de acompanhamento operacional.

Use issues para registrar:

- etapa em execução;
- responsável;
- status no Project;
- discussão de escopo;
- evidência de conclusão;
- vínculo com Pull Request.

O roteiro pode citar issues de referência quando isso ajudar a localizar o detalhe de um mapa ou bloco, mas não deve repetir o histórico completo que já existe no GitHub.

## Quando Atualizar Este Roteiro

Atualize este documento somente quando:

- uma etapa nova precisar entrar no planejamento geral;
- uma etapa planejada deixar de fazer sentido;
- uma prova técnica ou decisão alterar a ordem dos blocos;
- um mapa de apoio mudar de papel;
- o escopo final do projeto mudar.

Não atualize este roteiro apenas para marcar que uma issue foi concluída, que uma PR foi aberta ou que uma etapa mudou de coluna no Project.
