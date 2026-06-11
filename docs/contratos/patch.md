# Contrato do `patch.diff`

## Objetivo

Este documento define o papel do `patch.diff` na V1 do SVNFlow.

O `patch.diff` é a representação técnica da alteração exportada a partir do Git e aplicada depois em um checkout SVN.

## Origem

O patch deve ser gerado a partir de:

- repositório Git local válido;
- branch de origem;
- base de comparação definida;
- alterações detectadas entre origem e base.

## Uso

O patch deve ser:

- incluído dentro do pacote `.svnflow`;
- validado na importação;
- testado contra o checkout SVN antes da aplicação;
- aplicado somente após confirmação explícita.

## Bloqueios

O fluxo deve bloquear quando:

- o patch não existir;
- o patch não puder ser lido;
- o patch não encaixar no checkout SVN;
- o checkout SVN estiver em estado inseguro;
- houver risco claro de sobrescrita não controlada.

## Limites da V1

A V1 deve tratar arquivos binários, renomeações complexas, diferenças de fim de linha e conflitos como pontos de validação técnica antes de considerar o formato estável.

