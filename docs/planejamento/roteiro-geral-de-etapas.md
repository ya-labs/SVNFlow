# Roteiro Geral de Etapas do SVNFlow

## Objetivo

Este documento registra o avanço do desenvolvimento documental e técnico do SVNFlow.

Ele deve responder:

- o que já foi feito;
- qual etapa está em andamento;
- qual é a próxima tarefa recomendada;
- quais issues e PRs sustentam a rastreabilidade.

Este roteiro não é um guia de localização da documentação. Para encontrar pastas, documentos e índices, use o [Guia de Consulta da Documentação](../guia-da-documentacao.md).

## Resumo

| Campo | Valor |
| --- | --- |
| Status geral | `em andamento` |
| Etapa atual | reorganização do roteiro e dos mapas de planejamento |
| Issue atual | #42 |
| Próxima execução operacional | #28 |
| Project GitHub | `ya labs development` |
| Critério para avançar | PR da issue #42 mergeado e links validados |

## Trilha Atual

```text
SVNFlow
├── Descoberta inicial                    concluída
├── Alternativas e escopo da v1           concluída
├── Fluxos funcionais da v1               concluída
├── Contratos operacionais da v1          concluída
├── Mapas e rastreabilidade documental    concluída
├── Reorganização do roteiro e mapas      em andamento (#42)
└── Provas técnicas da v1                 próxima (#28)
```

## Etapas Concluídas

| Etapa | Evidência principal | Issue | PR | Resultado |
| --- | --- | --- | --- | --- |
| Descoberta inicial | `docs/planejamento-inicial/mapa-do-problema.md` | #1 | #4 | problema público e preventivo documentado |
| Matriz de alternativas | `docs/planejamento-inicial/matriz-de-alternativas.md` | #3 | #6 | alternativas iniciais comparadas |
| Escopo da v1 e pacote SVNFlow | `docs/decisoes/0001-escopo-v1.md`, `docs/decisoes/0002-contrato-inicial-pacote-svnflow.md` | #7, #9 | #8, #10 | recorte inicial e contrato do pacote definidos |
| Visão funcional da v1 | `docs/planejamento-v1/01-visao-funcional/visao-funcional-v1.md` | #11 | #12 | fluxos funcionais principais organizados |
| Fluxos operacionais | `docs/fluxos/` e `docs/decisoes/0003-commit-svn-protegido.md` | #13, #15, #17, #19, #21, #23 | #14, #16, #18, #20, #22, #24 | exportação, importação, aplicação, histórico, commit protegido e atualização pelo SVN documentados |
| Contratos operacionais | `docs/contratos/operacoes-v1.md` | #27 | #35 | comandos, entradas, saídas, bloqueios e confirmações documentados |
| Planejamento das próximas validações | `docs/planejamento-v1/02-contratos-validacoes/contratos-validacoes-v1.md` | #25 | #26 | ponte entre visão funcional e provas técnicas registrada |
| Mapa de provas técnicas | `docs/planejamento-v1/03-provas-tecnicas/provas-tecnicas-v1.md` | #38 | #39 | sequência #28 a #34 organizada |
| Padrão visual dos mapas | mapas oficiais da v1 | #40 | #41 | resumo, trilha textual e rastreabilidade padronizados |

## Etapa Atual

| Campo | Valor |
| --- | --- |
| Issue | #42 |
| Tema | reorganizar roteiro e mapas de planejamento |
| Objetivo | separar roteiro de desenvolvimento do guia de documentação |
| Saída esperada | roteiro como linha do tempo e mapas em pastas numeradas |
| Status | `em andamento` |

Critérios de conclusão da etapa atual:

- roteiro geral não duplicar o papel do guia da documentação;
- mapas da v1 ficarem em pastas numeradas por ordem;
- Mapa 01 ficar `concluído`;
- Mapa 02 ficar `documentado`;
- Mapa 03 ficar `em andamento`;
- links atualizados após os movimentos;
- issue #42 vinculada ao Project `ya labs development`;
- PR da issue #42 mergeado.

## Próximas Etapas

| Ordem | Issue | Etapa | Status |
| --- | --- | --- | --- |
| 1 | #28 | Documentar prova técnica de geração do patch | `próxima` |
| 2 | #29 | Documentar prova técnica de aplicação do patch | `pendente` |
| 3 | #30 | Documentar prova técnica de `svn update` | `pendente` |
| 4 | #31 | Documentar estratégia da base Git local | `pendente` |
| 5 | #32 | Documentar modelo inicial do histórico local | `pendente` |
| 6 | #33 | Documentar protótipo navegável da v1 | `pendente` |
| 7 | #34 | Documentar critérios de pronto da v1 | `pendente` |

## Critério Para Avançar

A próxima execução operacional deve ser a issue #28 somente depois que:

- a reorganização da issue #42 estiver mergeada;
- os links dos mapas reorganizados estiverem válidos;
- o roteiro apontar claramente que #28 é a próxima tarefa;
- o Project `ya labs development` estiver sendo usado nas issues novas.

## Regras de Atualização

Atualize este roteiro quando:

- uma etapa de desenvolvimento for concluída;
- uma issue mudar a próxima execução recomendada;
- uma decisão alterar a ordem das próximas tarefas;
- um mapa novo for criado;
- uma etapa planejada for replanejada ou bloqueada.

Não use este roteiro para explicar a estrutura completa das pastas. Esse papel pertence ao [Guia de Consulta da Documentação](../guia-da-documentacao.md).
