# Prova Técnica: Estratégia da Base Git Local

## Objetivo

Documentar a prova técnica da estratégia de atualização da base Git local após mudanças recebidas pelo SVN.

Esta prova valida como o SVNFlow pode manter a base local atualizada de forma assistida, sem criar merge automático em branches de trabalho e sem executar ações destrutivas sem confirmação explícita.

Este documento não define implementação final, stack, interface ou arquitetura do app desktop.

## Relação com a v1

Na v1, o SVN continua como destino oficial de publicação, mas o fluxo local depende de uma base Git coerente para exportar e revisar alterações com segurança.

Esta prova cobre apenas:

- estratégia para atualizar a base Git local após `svn update`;
- separação entre branch base e branches de alteração;
- estados bloqueantes que exigem confirmação explícita;
- limites de automação para evitar perda de trabalho.

Esta prova não cobre histórico local completo, protótipo navegável ou critérios finais de pronto.

## Premissas

- existe um repositório Git local fictício usado para organizar alterações;
- existe um checkout SVN fictício usado como referência oficial;
- a etapa de `svn update` já foi documentada;
- não há código corporativo real no cenário da prova.

## Entradas da Prova

| Entrada | Valor esperado |
| --- | --- |
| Repositório Git local | projeto fictício com branch base e branches de alteração |
| Checkout SVN | checkout fictício válido e atualizado |
| Estado da branch base | limpa e alinhável ao estado recebido do SVN |
| Estado das branches de alteração | preservado sem merge automático |
| Saída esperada | estratégia clara, com bloqueios e confirmações documentados |

## Cenário Fictício de Referência

Estrutura sugerida de branches:

```text
main                      -> base local sincronizável
feature/exportacao-a      -> alteração em andamento
feature/importacao-b      -> alteração em andamento
```

Situação inicial esperada:

- `main` representa a base local do fluxo;
- branches `feature/*` têm trabalho em andamento e não devem receber atualização automática;
- mudanças vindas do SVN devem primeiro refletir na base local;
- branches de trabalho devem ser reconciliadas manualmente depois.

## Estratégia Candidata

1. Validar pré-condições na branch base (`main`):

- diretório é repositório Git válido;
- working tree da base está limpa;
- não há operação Git pendente (merge/rebase/cherry-pick interrompido).

2. Aplicar atualização da base local apenas na branch base, nunca em branch `feature/*` automaticamente.

3. Se a base estiver suja, bloquear atualização e exigir ação explícita da pessoa usuária.

4. Após atualizar a base, orientar que cada branch de alteração faça reconciliação manual (merge/rebase) fora do fluxo automático sensível.

5. Registrar resultado da atualização e possíveis bloqueios para suporte ao histórico local em etapa futura.

## Comandos Candidatos

Os comandos abaixo servem como referência para a prova técnica. Eles não representam decisão final de implementação.

Validar branch atual:

```bash
git branch --show-current
```

Validar limpeza da base:

```bash
git status --porcelain
```

Validar operações interrompidas:

```bash
test -d .git/rebase-apply -o -d .git/rebase-merge -o -f .git/MERGE_HEAD
```

Atualizar referência remota da base local:

```bash
git fetch --all --prune
```

Atualizar branch base de forma linear (quando aplicável):

```bash
git checkout main
git pull --ff-only
```

## Cenário Compatível

Condições:

- branch base limpa;
- sem operação interrompida;
- atualização linear possível.

Resultado esperado:

- base local atualizada com sucesso;
- branches de alteração não modificadas automaticamente;
- orientação de reconciliação manual disponível.

## Cenário de Falha Controlada

Exemplos de falha controlada:

- base local com alterações não commitadas;
- operação de merge/rebase interrompida;
- atualização da base exigindo merge não fast-forward.

Comportamento esperado:

- bloquear continuação automática;
- exibir mensagem objetiva com motivo do bloqueio;
- não descartar alterações locais;
- não executar comandos destrutivos;
- sugerir ação manual segura para prosseguir.

## Mensagens Candidatas

| Situação | Mensagem candidata |
| --- | --- |
| Base local com alterações | `A branch base possui alterações locais. Limpe o estado antes de atualizar.` |
| Operação Git interrompida | `Há uma operação Git pendente. Conclua ou cancele antes de atualizar a base.` |
| Atualização não linear | `A atualização da base não é fast-forward. Resolva manualmente antes de continuar.` |
| Tentativa fora da branch base | `A atualização automática só pode ocorrer na branch base local.` |
| Falha inesperada | `Não foi possível atualizar a base Git local no momento.` |

## Critérios Para Considerar a Prova Documentada

A prova será considerada documentada quando registrar:

- estratégia explícita para atualização da base local;
- regra de não atualizar automaticamente branches de alteração;
- cenários compatível e de falha controlada;
- bloqueios obrigatórios para estados inseguros;
- limite claro contra ações destrutivas automáticas;
- mensagens candidatas para interface.

## Fora de Escopo

Esta prova não cobre:

- implementação de histórico local completo;
- decisão final entre merge e rebase para equipes;
- resolução automática de conflito entre branches;
- execução em ambiente corporativo real;
- definição de stack, biblioteca, linguagem ou arquitetura.

## Resultado Esperado da Prova

Ao concluir esta prova, o projeto deve ter:

- estratégia da base Git local documentada;
- bloqueios de segurança operacional definidos;
- separação clara entre base atualizada e branches de alteração;
- base suficiente para documentar o modelo inicial do histórico local.