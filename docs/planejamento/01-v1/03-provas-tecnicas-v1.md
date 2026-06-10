# Mapa 03 - Provas Técnicas da v1

## Objetivo

Este documento organiza as provas técnicas da v1 do SVNFlow.

O objetivo é reduzir risco antes da implementação do app desktop, validando em ambiente fictício os comportamentos mais importantes do fluxo: geração de patch, aplicação no checkout SVN, atualização pelo SVN, estratégia da base Git local, histórico local, protótipo navegável e critérios de pronto.

Este mapa não define stack, arquitetura final ou implementação definitiva.

## Resumo

| Campo | Valor |
| --- | --- |
| Mapa | 03 - Provas Técnicas da v1 |
| Status geral | `em andamento` |
| Objetivo | validar comportamento técnico antes da implementação desktop |
| Escopo | provas técnicas em ambiente fictício |
| Fora de escopo | stack final, arquitetura desktop e protótipo visual |

## Critérios do Mapa

Cada prova técnica deve ter:

- objetivo claro;
- ambiente fictício;
- saída esperada;
- critério de conclusão;
- falhas ou limites observados;
- indicação do que fica fora da prova.

Status possíveis:

- `concluída`;
- `documentada`;
- `próxima`;
- `pendente`;
- `bloqueada`;
- `replanejada`.

## Visão Geral

```text
1. Geração de patch
2. Aplicação de patch
3. Atualização pelo SVN
4. Estratégia da base Git local
5. Modelo inicial do histórico local
6. Protótipo navegável da v1
7. Critérios de pronto da v1
```

## Trilha

```text
03 - Provas Técnicas da v1
├── Geração do patch        documentada
├── Aplicação do patch      documentada
├── svn update              pendente
├── Base Git local          pendente
├── Histórico local         pendente
├── Protótipo navegável     pendente
└── Critérios de pronto     pendente
```

## Rastreabilidade

| Ordem | Etapa | Documento | Status da etapa |
| --- | --- | --- | --- |
| 1 | Geração do patch | `docs/prototipo/prova-tecnica-geracao-patch.md` | `documentada` |
| 2 | Aplicação do patch | `docs/prototipo/prova-tecnica-aplicacao-patch.md` | `documentada` |
| 3 | `svn update` | este mapa | `pendente` |
| 4 | Base Git local | este mapa | `pendente` |
| 5 | Histórico local | este mapa | `pendente` |
| 6 | Protótipo navegável | este mapa | `pendente` |
| 7 | Critérios de pronto | este mapa | `pendente` |

## 1. Geração de Patch

Status: `documentada`

Objetivo:

Validar como gerar `patch.diff` a partir de uma alteração preparada no Git, usando uma branch de origem e uma base de comparação.

Saída esperada:

- patch gerado em projeto fictício;
- arquivos criados, modificados e removidos testados;
- limites iniciais documentados;
- observações sobre encoding e fim de linha registradas;
- comandos e saídas úteis para futura interface anotados.

Critério de conclusão:

- patch gerado com sucesso em cenário simples;
- conteúdo revisável;
- falhas principais anotadas;
- nenhuma dependência de código real.

Documento relacionado:

- [Prova técnica: Geração de Patch](../../prototipo/prova-tecnica-geracao-patch.md)

## 2. Aplicação de Patch

Status: `documentada`

Objetivo:

Validar se o `patch.diff` gerado encaixa em um checkout SVN compatível.

Saída esperada:

- aplicação testada em checkout SVN fictício;
- comportamento com checkout limpo validado;
- comportamento com checkout divergente observado;
- mensagens de falha candidatas registradas;
- `svn status` exibido após aplicação.

Critério de conclusão:

- patch aplicado em cenário simples;
- falha controlada em cenário incompatível;
- estado final do checkout SVN documentado.

Documento relacionado:

- [Prova Técnica: Aplicação de Patch](../../prototipo/prova-tecnica-aplicacao-patch.md)

## 3. Atualização pelo SVN

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

## 4. Estratégia da Base Git Local

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

## 5. Modelo Inicial do Histórico Local

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

## 6. Protótipo Navegável da v1

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

## 7. Critérios de Pronto da v1

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

## Ordem Recomendada

A ordem recomendada é seguir a sequência técnica abaixo.

Motivo:

- geração de patch precisa vir antes da aplicação;
- aplicação de patch precisa vir antes da validação completa do fluxo;
- `svn update` influencia a estratégia de base local;
- histórico local depende dos eventos reais do fluxo;
- protótipo navegável deve consolidar evidências anteriores;
- critérios de pronto devem fechar a v1 com base nas validações.

## Fora de Escopo

Este mapa não pretende:

- executar as provas técnicas;
- escolher stack final;
- definir arquitetura desktop;
- criar protótipo visual;
- empacotar aplicação;
- usar código corporativo real.

## Próxima Etapa do Mapa

A próxima etapa do mapa é documentar e validar a atualização pelo SVN em checkout SVN fictício, incluindo saída esperada de `svn status` e falhas controladas de `svn update`.
