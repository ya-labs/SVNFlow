# Mapa 02 - Contratos e Validações da v1

## Objetivo

Este documento registra o bloco de contratos e validações que conectou a visão funcional inicial às provas técnicas da v1.

O objetivo foi transformar os fluxos documentados em contratos operacionais e preparar a sequência de provas técnicas, sem escolher stack, arquitetura final ou implementação definitiva antes da hora.

## Resumo

| Campo | Valor |
| --- | --- |
| Mapa | 02 - Contratos e Validações da v1 |
| Status geral | `documentado` |
| Próxima issue | continuidade no Mapa 03 pela issue #29 |
| Objetivo | registrar contratos operacionais e preparação das provas técnicas |
| Escopo | contratos operacionais e preparação das provas técnicas |

## Critérios do bloco

Cada etapa deve produzir evidência prática para reduzir risco de implementação.

As etapas devem evitar:

- definir stack final do app;
- automatizar operações sensíveis sem confirmação;
- usar código corporativo real;
- tratar protótipo como produto pronto;
- transformar hipótese técnica em decisão permanente.

## Visão geral

```text
9. Contratos operacionais dos comandos
10. Prova técnica de geração do patch
11. Prova técnica de aplicação do patch
12. Prova técnica de svn update
13. Estratégia da base Git local
14. Modelo inicial do histórico local
15. Protótipo navegável da v1
16. Critérios de pronto da v1
```

## Trilha

```text
02 - Contratos e Validações da v1
├── #27 Contratos operacionais dos comandos   documentada
├── #28 Prova técnica de geração do patch     documentada
├── #29 Prova técnica de aplicação do patch   próxima
├── #30 Prova técnica de svn update           pendente
├── #31 Estratégia da base Git local          pendente
├── #32 Modelo inicial do histórico local     pendente
├── #33 Protótipo navegável da v1             pendente
└── #34 Critérios de pronto da v1             pendente
```

## Rastreabilidade

| Ordem | Issue | Etapa | Documento | Status |
| --- | --- | --- | --- | --- |
| 9 | #27 | Contratos operacionais dos comandos | `docs/contratos/operacoes-v1.md` | `documentada` |
| 10 | #28 | Prova técnica de geração do patch | `docs/prototipo/prova-tecnica-geracao-patch.md` | `documentada` |
| 11 | #29 | Prova técnica de aplicação do patch | `docs/planejamento-v1/provas-tecnicas-v1.md` | `próxima` |
| 12 | #30 | Prova técnica de `svn update` | `docs/planejamento-v1/provas-tecnicas-v1.md` | `pendente` |
| 13 | #31 | Estratégia da base Git local | `docs/planejamento-v1/provas-tecnicas-v1.md` | `pendente` |
| 14 | #32 | Modelo inicial do histórico local | `docs/planejamento-v1/provas-tecnicas-v1.md` | `pendente` |
| 15 | #33 | Protótipo navegável da v1 | `docs/planejamento-v1/provas-tecnicas-v1.md` | `pendente` |
| 16 | #34 | Critérios de pronto da v1 | `docs/planejamento-v1/provas-tecnicas-v1.md` | `pendente` |

## 9. Contratos operacionais dos comandos

Status: `documentada`

Objetivo:

Definir quais operações o SVNFlow precisa executar, quais entradas elas recebem, quais saídas devem mostrar e quais estados bloqueiam o fluxo.

Saída esperada:

- contrato de detecção de branch Git;
- contrato de geração de `patch.diff`;
- contrato de validação de pacote `.svnflow`;
- contrato de validação de checkout SVN;
- contrato de aplicação de patch;
- contrato de `svn status`;
- contrato de `svn update`;
- contrato de commit SVN protegido;
- contrato de registro no histórico local.

Critério de conclusão:

- operações listadas com entrada, saída, confirmação exigida e falhas esperadas;
- comandos sensíveis marcados como protegidos;
- nenhuma stack final escolhida.

Documento relacionado:

- [Contratos operacionais dos comandos](../contratos/operacoes-v1.md)

## 10. Prova técnica de geração do patch

Status: `documentada`

Objetivo:

Validar como gerar `patch.diff` a partir de uma alteração preparada no Git, comparando branch de origem e base de comparação.

Saída esperada:

- patch gerado em projeto fictício;
- arquivos adicionados, alterados e removidos testados;
- limites iniciais documentados;
- observações sobre encoding e fim de linha registradas.

Critério de conclusão:

- patch gerado com sucesso;
- conteúdo revisável;
- falhas principais anotadas.

Documento relacionado:

- [Prova técnica: Geração de Patch](../prototipo/prova-tecnica-geracao-patch.md)

## 11. Prova técnica de aplicação do patch

Status: `próxima`

Objetivo:

Validar se o `patch.diff` gerado pelo SVNFlow encaixa em um checkout SVN compatível.

Saída esperada:

- aplicação testada em checkout SVN fictício;
- comportamento com checkout limpo validado;
- comportamento com checkout divergente observado;
- mensagens de falha candidatas registradas.

Critério de conclusão:

- patch aplicado em cenário simples;
- falha controlada em cenário incompatível;
- `svn status` exibido após aplicação.

## 12. Prova técnica de `svn update`

Status: `pendente`

Objetivo:

Validar o fluxo do botão **Atualizar Base pelo SVN** em um checkout SVN fictício.

Saída esperada:

- atualização SVN executada em ambiente de teste;
- arquivos recebidos listados;
- revisão SVN resultante capturada;
- conflito simples observado, se possível;
- `svn status` exibido ao final.

Critério de conclusão:

- `svn update` validado sem alterar código real;
- saídas úteis para UI documentadas;
- falhas comuns registradas.

## 13. Estratégia da base Git local

Status: `pendente`

Objetivo:

Definir como a base Git local deve acompanhar alterações recebidas pelo SVN sem criar merge automático em branches de trabalho.

Saída esperada:

- regra para atualizar base local de forma assistida;
- limites do que o SVNFlow pode alterar automaticamente;
- estados que exigem confirmação explícita;
- orientação para manter branches de alteração separadas da base atualizada.

Critério de conclusão:

- estratégia documentada;
- ações destrutivas bloqueadas;
- relação entre Git local e SVN oficial clara.

## 14. Modelo inicial do histórico local

Status: `pendente`

Objetivo:

Definir o modelo mínimo do histórico local usado pelo protótipo, sem criar auditoria oficial.

Saída esperada:

- campos mínimos confirmados;
- status possíveis confirmados;
- relação com pacotes exportados/importados registrada;
- possibilidade de registrar falhas de aplicação e atualização pelo SVN avaliada.

Critério de conclusão:

- modelo mínimo suficiente para protótipo;
- limites do histórico local explícitos;
- nenhuma dependência de banco complexo definida.

## 15. Protótipo navegável da v1

Status: `pendente`

Objetivo:

Montar uma experiência navegável que conecte os fluxos principais da v1 em ambiente fictício.

Saída esperada:

- navegação entre exportação, importação, aplicação, histórico, commit protegido e atualização pelo SVN;
- estados de sucesso, erro e bloqueio representados;
- textos de confirmação revisados;
- fluxo compreensível sem depender de conhecimento avançado de Git ou SVN.

Critério de conclusão:

- protótipo revisável por outra pessoa;
- principais decisões de UX validadas;
- lacunas técnicas registradas.

## 16. Critérios de pronto da v1

Status: `pendente`

Objetivo:

Definir o que precisa estar validado para considerar a v1 pronta para implementação ou entrega experimental.

Saída esperada:

- critérios mínimos de funcionalidade;
- critérios mínimos de segurança operacional;
- critérios mínimos de documentação;
- critérios mínimos de validação em projeto fictício;
- lista explícita do que fica fora da v1.

Critério de conclusão:

- checklist de pronto documentado;
- riscos aceitos registrados;
- próximos passos após a v1 definidos.

## Conclusão do Mapa

Este mapa está documentado como ponte entre a visão funcional e as provas técnicas.

Motivo:

- os fluxos funcionais já estão mapeados;
- os contratos operacionais já foram documentados;
- as próximas validações estão concentradas no Mapa 03;
- ainda não há escolha de stack ou arquitetura final.

Próxima execução operacional:

```text
#29 Documentar prova técnica de aplicação do patch
```
