# Prova Técnica: Atualização pelo SVN (`svn update`)

## Objetivo

Documentar a prova técnica de atualização de checkout SVN fictício usando `svn update`.

Esta prova valida o comportamento esperado da etapa **Atualizar Base pelo SVN** no fluxo da v1, incluindo cenário compatível e cenário com conflito simples controlado.

Este documento não define implementação final, stack, interface ou arquitetura do app desktop.

## Relação com a v1

Na v1, a atualização pelo SVN ocorre após importação e aplicação de alteração no checkout de trabalho.

Esta prova cobre apenas:

- execução de `svn update` em checkout fictício;
- leitura das saídas relevantes para interface;
- validação de revisão resultante;
- observação de conflito simples e comportamento esperado de bloqueio;
- leitura de `svn status` após atualização.

Esta prova não cobre commit SVN nem resolução automática de conflito.

## Entradas da Prova

| Entrada | Valor esperado |
| --- | --- |
| Checkout SVN | checkout fictício local |
| Estado inicial | checkout versionado e acessível |
| Rede/servidor | ambiente de teste disponível |
| Confirmação | atualização autorizada manualmente durante a prova |
| Saída esperada | revisão atualizada, arquivos recebidos e status final |

## Cenário Fictício de Sucesso

A prova deve usar checkout SVN local fictício, sem conteúdo corporativo real.

Estrutura inicial sugerida:

```text
checkout-svn-ficticio/
|-- docs/
|   |-- leitura.md
|   `-- notas-operacao.txt
`-- src/
    `-- modulo-exemplo.txt
```

Premissas para o cenário compatível:

- checkout aponta para URL SVN fictícia válida;
- diretório é reconhecido por `svn info`;
- alterações remotas existem e podem ser recebidas;
- não há conflito bloqueante local no momento da atualização.

## Comandos Candidatos

Os comandos abaixo servem como referência para a prova técnica. Eles não representam decisão final de implementação.

Validar checkout SVN:

```bash
svn info
```

Consultar estado antes da atualização:

```bash
svn status
```

Executar atualização da base local:

```bash
svn update
```

Consultar estado após atualização:

```bash
svn status
```

Capturar revisão local após atualização:

```bash
svn info --show-item revision
```

## Saída Esperada em Cenário Compatível

Quando a atualização ocorrer sem conflito, a prova deve registrar:

- execução de `svn update` sem erro;
- saída com arquivos atualizados recebidos;
- revisão local final capturada;
- `svn status` final sem bloqueio inesperado.

Exemplo conceitual de saída de `svn update`:

```text
U    docs/leitura.md
U    src/modulo-exemplo.txt
Updated to revision 128.
```

O conteúdo acima é fictício e serve apenas para demonstrar o tipo de saída esperado.

## Cenário de Falha Controlada

A prova também deve registrar cenário simples de conflito durante `svn update`.

Exemplos de condições de conflito controlado:

- alteração remota no mesmo trecho alterado localmente;
- arquivo removido remotamente e modificado localmente;
- atualização interrompida por conflito textual.

Comportamento esperado:

- `svn update` sinaliza conflito no terminal;
- revisão pode avançar parcialmente;
- estado final evidencia necessidade de ação manual;
- fluxo deve bloquear continuidade automática sensível;
- conflito não deve ser resolvido automaticamente.

Exemplo conceitual de saída com conflito:

```text
C    src/modulo-exemplo.txt
Updated to revision 129.
Summary of conflicts:
  Text conflicts: 1
```

Exemplo conceitual de `svn status` após conflito:

```text
C       src/modulo-exemplo.txt
?       src/modulo-exemplo.txt.mine
?       src/modulo-exemplo.txt.r128
?       src/modulo-exemplo.txt.r129
```

## Mensagens de Falha Candidatas

As mensagens abaixo são candidatas para interface futura. Elas não são textos finais.

| Situação | Mensagem candidata |
| --- | --- |
| Diretório não é checkout SVN | `O diretório selecionado não parece ser um checkout SVN válido.` |
| Falha de comunicação com repositório SVN | `Não foi possível atualizar a base pelo SVN no momento.` |
| Conflito detectado no update | `A atualização pelo SVN gerou conflito e exige revisão manual.` |
| Atualização parcial com conflito | `A base foi atualizada parcialmente e possui conflitos pendentes.` |
| Erro inesperado durante update | `Falha ao executar svn update. Revise o log e tente novamente.` |

## Critérios Para Considerar a Prova Documentada

A prova será considerada documentada quando registrar:

- cenário de sucesso com `svn update`;
- cenário de conflito simples controlado;
- saída candidata de atualização sem conflito;
- saída candidata de atualização com conflito;
- leitura de revisão local após update;
- leitura de `svn status` pós-update;
- limites explícitos sobre resolução de conflito e commit SVN.

## Fora de Escopo

Esta prova não cobre:

- commit SVN;
- resolução automática de conflitos;
- manipulação automática de arquivos auxiliares de conflito;
- atualização em código real;
- escolha de biblioteca, linguagem ou framework;
- implementação da interface visual;
- estratégia de sincronização da base Git local.

## Resultado Esperado da Prova

Ao concluir esta prova, o projeto deve ter:

- prova técnica de `svn update` documentada;
- saída esperada em cenário compatível registrada;
- conflito simples e seus efeitos documentados;
- mensagens candidatas para interface anotadas;
- base suficiente para documentar a estratégia da base Git local.