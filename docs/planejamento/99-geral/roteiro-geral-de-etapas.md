# Roteiro Geral de Etapas do SVNFlow

## Objetivo

Este documento define um roteiro simples de etapas para orientar o SVNFlow até o fim do projeto.

Ele deve responder, em alto nível:

- quais blocos precisam existir;
- em que ordem os blocos devem ser tratados;
- qual saída cada bloco deve produzir;
- quais mapas ajudam a detalhar cada bloco.

Este roteiro não deve funcionar como registro de execução diária, histórico operacional ou painel de status. Esse acompanhamento fica no GitHub.

O roteiro pode mudar quando uma decisão ou prova técnica justificar ajuste real de direção, mas não precisa ser reescrito a cada etapa concluída.

Para encontrar pastas, documentos e índices, use o [Guia de Consulta da Documentação](../../guia-da-documentacao.md).

## Princípios

O roteiro deve ser:

- simples o suficiente para não duplicar o GitHub;
- estável o suficiente para orientar o projeto até a entrega;
- flexível o suficiente para aceitar replanejamento quando houver evidência;
- genérico o suficiente para não registrar conteúdo corporativo real;
- rastreável por mapas e documentos relacionados, sem transformar o documento em controle operacional.

## Etapas Planejadas

| Ordem | Etapa | Objetivo | Saída esperada | Referência |
| --- | --- | --- | --- | --- |
| 1 | Descoberta e recorte inicial | Entender o problema, comparar alternativas e definir o recorte público da v1. | Problema, alternativas e decisão inicial documentados. | `docs/planejamento/00-inicial/`, `docs/decisoes/0001-escopo-v1.md` |
| 2 | Visão funcional da v1 | Organizar os fluxos principais que precisam existir antes de discutir implementação. | Mapa funcional da v1 e fluxos de uso documentados. | [Mapa 01](../01-v1/01-visao-funcional-v1.md) |
| 3 | Contratos e validações da v1 | Definir entradas, saídas, confirmações, bloqueios e limites das operações sensíveis. | Contratos operacionais e mapa de validações documentados. | [Mapa 02](../01-v1/02-contratos-validacoes-v1.md) |
| 4 | Provas técnicas da v1 | Validar, em ambiente fictício, se os comandos e fluxos centrais funcionam antes da implementação real. | Evidências sobre geração de patch, aplicação de patch, `svn update`, base Git local e histórico local. | [Mapa 03](../01-v1/03-provas-tecnicas-v1.md) |
| 5 | Protótipo navegável | Representar a experiência principal da v1 com telas, estados, confirmações e bloqueios. | Protótipo revisável da jornada principal. | Mapa de protótipo futuro |
| 6 | Definição técnica da aplicação desktop | Escolher stack, arquitetura mínima, empacotamento e limites de automação com base nas provas. | Decisões técnicas registradas e plano de implementação preparado. | Decisão técnica futura |
| 7 | Implementação da v1 | Construir o aplicativo desktop local respeitando os contratos, provas e decisões aceitas. | V1 funcional em cenário fictício, sem conteúdo corporativo real. | Plano de implementação futuro |
| 8 | Validação e release experimental | Validar a v1 em ambiente controlado e preparar uma entrega experimental segura. | Checklist de pronto, limitações conhecidas e release experimental. | Critérios de pronto |
| 9 | Evolução pós-v1 | Registrar melhorias futuras depois que a v1 estiver validada. | Backlog pós-v1 separado do escopo inicial. | Planejamento pós-v1 |

## Mapas de Apoio

Os mapas detalham partes específicas do roteiro.

| Mapa | Arquivo | Papel |
| --- | --- | --- |
| Mapa 01 - Visão Funcional da v1 | [01-visao-funcional-v1.md](../01-v1/01-visao-funcional-v1.md) | Organizar fluxos funcionais e primeiros limites da v1. |
| Mapa 02 - Contratos e Validações da v1 | [02-contratos-validacoes-v1.md](../01-v1/02-contratos-validacoes-v1.md) | Conectar fluxos, contratos e validações necessárias antes da implementação. |
| Mapa 03 - Provas Técnicas da v1 | [03-provas-tecnicas-v1.md](../01-v1/03-provas-tecnicas-v1.md) | Organizar as provas técnicas que reduzem risco antes da decisão de stack. |

## Quando Atualizar Este Roteiro

Atualize este documento somente quando:

- uma etapa nova precisar entrar no planejamento geral;
- uma etapa planejada deixar de fazer sentido;
- uma prova técnica ou decisão alterar a ordem dos blocos;
- um mapa de apoio mudar de papel;
- o escopo final do projeto mudar.

Não atualize este roteiro apenas para registrar andamento operacional do GitHub.
