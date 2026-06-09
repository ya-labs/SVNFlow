# Aplicação do Patch no Checkout SVN

## Objetivo

A aplicação do patch é a etapa em que o SVNFlow usa o `patch.diff` de um pacote `.svnflow` aceito para modificar um checkout SVN de desenvolvimento.

Essa etapa deve ser controlada, validada e separada do commit SVN.

## Entrada do fluxo

O fluxo começa depois que um pacote `.svnflow` foi importado, validado e aceito.

Entrada mínima:

- pacote `.svnflow` válido;
- `patch.diff` disponível;
- checkout SVN de destino selecionado;
- pessoa usuária confirmou que deseja aplicar a alteração.

## Validações antes da aplicação

Antes de alterar qualquer arquivo, o SVNFlow deve validar:

- se o checkout SVN existe;
- se o diretório de destino é um checkout SVN válido;
- se o checkout está limpo ou em estado permitido;
- se o `patch.diff` pode ser lido;
- se os arquivos mencionados no patch existem ou podem ser criados conforme esperado;
- se o patch encaixa no destino antes da aplicação;
- se a pessoa confirmou explicitamente a aplicação.

Se qualquer validação falhar, o app deve bloquear a aplicação e mostrar erro claro.

## Aplicação

Após validação e confirmação, o SVNFlow deve aplicar o patch no checkout SVN.

O app deve tratar a aplicação como operação sensível.

Durante a aplicação, o app deve:

- mostrar que a operação está em andamento;
- impedir nova aplicação simultânea do mesmo pacote;
- capturar sucesso ou falha;
- não executar commit SVN automaticamente.

## Falhas

Se o patch não encaixar ou a aplicação falhar, o SVNFlow deve:

- interromper o fluxo;
- não sobrescrever arquivos automaticamente;
- mostrar uma mensagem objetiva;
- manter o status do pacote como `falhou`, quando houver histórico local;
- orientar que o checkout SVN seja revisado antes de nova tentativa.

Exemplos de falhas:

- checkout SVN sujo;
- arquivo esperado não encontrado;
- arquivo modificado no destino;
- diferença de fim de linha;
- patch incompatível com a versão local.

## Resultado após sucesso

Após aplicar o patch com sucesso, o app deve mostrar:

- arquivos afetados;
- resultado da aplicação;
- `svn status` atualizado;
- próximo passo sugerido.

O próximo passo pode ser revisão manual, execução de testes locais ou commit SVN protegido, dependendo da decisão da v1.

## Separação do commit SVN

Aplicar o patch não significa publicar no SVN.

O commit SVN deve continuar separado e protegido por confirmação explícita.

## Cenários da v1

A v1 deve cobrir:

- validar checkout SVN antes da aplicação;
- validar encaixe do `patch.diff`;
- aplicar patch em checkout compatível;
- bloquear aplicação quando o patch não encaixar;
- mostrar `svn status` após sucesso;
- não executar commit SVN automaticamente.
