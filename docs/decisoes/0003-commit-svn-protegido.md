# Decisão 0003: Commit SVN protegido

## Status

Aceita para orientar a v1.

## Contexto

O SVN permanece como destino oficial de publicação no cenário estudado pelo SVNFlow.

Por isso, o commit SVN é a operação mais sensível do fluxo. Uma alteração aplicada no checkout SVN ainda pode ser revisada, ajustada ou descartada antes da publicação. Um commit SVN, por outro lado, publica a alteração no repositório oficial.

## Decisão

Na v1, o commit SVN deve ser uma etapa separada, protegida e nunca automática.

Aplicar um `patch.diff` no checkout SVN não deve executar commit.

O SVNFlow pode apoiar o commit com validações, prévia e mensagem sugerida, mas a publicação deve exigir confirmação explícita da pessoa usuária.

## Comportamento esperado

Antes de permitir commit SVN, o app deve validar:

- se o diretório selecionado é um checkout SVN válido;
- se existe alteração pendente em `svn status`;
- se a pessoa revisou os arquivos afetados;
- se existe mensagem de commit preenchida ou sugerida;
- se a pessoa confirmou explicitamente a publicação.

O app deve deixar claro que o commit envia alterações para o SVN oficial.

## Fora da v1

Ficam fora do recorte imediato:

- commit SVN automático após aplicar patch;
- commit sem prévia;
- commit sem confirmação explícita;
- resolução automática de conflitos antes do commit;
- substituição de políticas internas de revisão e publicação.

## Consequências

Essa decisão reduz risco de publicação acidental.

O fluxo pode continuar rápido, mas a etapa de publicação permanece consciente e reversível até o momento da confirmação final.

Se o protótipo inicial não implementar o botão de commit, o SVNFlow ainda deve orientar a pessoa com `svn status` e mensagem sugerida, mantendo o commit como etapa manual assistida.
