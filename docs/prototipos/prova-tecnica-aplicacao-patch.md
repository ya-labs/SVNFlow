# Prova Técnica: Aplicação de Patch

## Objetivo

Documentar a prova técnica de aplicação do `patch.diff` em um checkout SVN fictício.

Esta prova valida se um patch gerado a partir de uma branch Git pode encaixar em um checkout SVN compatível, alterar os arquivos esperados e produzir uma saída de `svn status` útil para a interface do SVNFlow.

Este documento não define implementação final, stack, interface ou arquitetura do app desktop.

## Relação com a v1

Na v1, o pacote `.svnflow` transporta a alteração técnica por meio de `patch.diff`.

Depois que o pacote for importado, validado e aceito, o SVNFlow deve aplicar esse patch no checkout SVN selecionado, sem executar commit SVN automaticamente.

Esta prova cobre apenas:

- validação de encaixe do patch;
- aplicação em checkout SVN fictício;
- comportamento em cenário compatível;
- comportamento em cenário divergente;
- leitura de `svn status` após aplicação.

## Entradas da Prova

| Entrada | Valor esperado |
| --- | --- |
| Checkout SVN | checkout fictício local |
| Patch | `patch.diff` gerado na prova de geração |
| Estado inicial | checkout limpo ou em estado permitido |
| Confirmação | aplicação autorizada manualmente durante a prova |
| Saída esperada | arquivos alterados e `svn status` resultante |

## Cenário Fictício de Sucesso

A prova deve usar um checkout SVN local fictício, sem conteúdo corporativo real.

Estrutura inicial sugerida:

```text
checkout-svn-ficticio/
|-- docs/
|   |-- arquivo-alterado.txt
|   |-- arquivo-removido.txt
|   `-- leitura.md
`-- src/
    `-- modulo-exemplo.txt
```

O patch usado na prova deve representar:

- modificação de `docs/arquivo-alterado.txt`;
- criação de `docs/arquivo-criado.txt`;
- remoção de `docs/arquivo-removido.txt`;
- modificação de `src/modulo-exemplo.txt`.

Antes da aplicação, o checkout deve estar compatível com a base usada para gerar o patch.

## Comandos Candidatos

Os comandos abaixo servem como referência para a prova técnica. Eles não representam decisão final de implementação.

Validar se o diretório é um checkout SVN:

```bash
svn info
```

Verificar estado inicial:

```bash
svn status
```

Pré-validar encaixe do patch sem alterar arquivos:

```bash
git apply --check patch.diff
```

Aplicar o patch após confirmação explícita:

```bash
git apply patch.diff
```

Verificar estado final do checkout:

```bash
svn status
```

## Saída Esperada em Cenário Compatível

Quando o patch encaixar, a prova deve registrar:

- validação de checkout SVN bem-sucedida;
- `svn status` inicial sem alterações bloqueantes;
- `git apply --check` executado com sucesso;
- patch aplicado sem erro;
- arquivos alterados conforme esperado;
- `svn status` final exibindo o estado dos arquivos.

Exemplo conceitual de `svn status` após aplicação:

```text
M       docs/arquivo-alterado.txt
?       docs/arquivo-criado.txt
!       docs/arquivo-removido.txt
M       src/modulo-exemplo.txt
```

O conteúdo acima é fictício e serve apenas para demonstrar o tipo de saída esperado.

## Ponto de Atenção: Arquivos Criados e Removidos

A aplicação do patch pode criar ou remover arquivos fisicamente no checkout SVN.

Isso não significa, necessariamente, que o SVN registrou essas mudanças como operações versionadas.

Durante a prova, observar:

- se arquivos criados aparecem como `?` em `svn status`;
- se arquivos removidos aparecem como `!` em `svn status`;
- se será necessário orientar ou automatizar `svn add` e `svn delete` em etapa futura;
- se essa decisão deve entrar no contrato de aplicação ou no commit SVN protegido.

Esta prova não deve decidir automação de `svn add` ou `svn delete`. Ela deve apenas registrar o comportamento observado e o risco para a v1.

## Cenário de Falha Controlada

A prova também deve validar um cenário em que o patch não encaixa.

Exemplos de divergência controlada:

- alterar previamente `docs/arquivo-alterado.txt` no checkout SVN;
- remover um arquivo esperado pelo patch antes da aplicação;
- usar checkout baseado em versão diferente da base de comparação;
- alterar fim de linha de um arquivo afetado.

Comportamento esperado:

- `git apply --check patch.diff` falha;
- nenhum arquivo deve ser alterado pela pré-validação;
- aplicação deve ser bloqueada;
- mensagem de falha deve indicar que o patch não encaixa no checkout atual;
- o fluxo não deve tentar resolver conflito automaticamente.

## Mensagens de Falha Candidatas

As mensagens abaixo são candidatas para interface futura. Elas não são textos finais.

| Situação | Mensagem candidata |
| --- | --- |
| Checkout não é SVN | `O diretório selecionado não parece ser um checkout SVN válido.` |
| Checkout com alterações locais | `Existem alterações locais no checkout SVN. Revise antes de aplicar o patch.` |
| Patch não encaixa | `O patch não encaixa na versão atual do checkout SVN.` |
| Arquivo esperado ausente | `Um arquivo esperado pelo patch não foi encontrado no checkout.` |
| Falha durante aplicação | `Não foi possível aplicar o patch. Nenhuma publicação SVN foi executada.` |

## Critérios Para Considerar a Prova Documentada

A prova será considerada documentada quando registrar:

- cenário de sucesso;
- cenário de falha controlada;
- comando candidato de pré-validação;
- comando candidato de aplicação;
- saída esperada de `svn status`;
- separação clara entre aplicar patch e fazer commit SVN;
- observações sobre arquivos criados e removidos;
- limites que precisam ser avaliados em etapas futuras.

## Fora de Escopo

Esta prova não cobre:

- commit SVN;
- execução de `svn add` ou `svn delete`;
- resolução automática de conflitos;
- aplicação de patch em código real;
- escolha de biblioteca, linguagem ou framework;
- implementação da interface visual;
- atualização da base local pelo SVN.

## Resultado Esperado da Prova

Ao concluir esta prova, o projeto deve ter:

- prova técnica de aplicação de patch documentada;
- cenário compatível descrito;
- cenário divergente descrito;
- `svn status` esperado registrado;
- mensagens de falha candidatas anotadas;
- base suficiente para documentar a prova técnica de `svn update`.
