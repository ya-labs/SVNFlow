# Atualização da Base Local a Partir do SVN

## Objetivo

A atualização da base local a partir do SVN é o fluxo em que o SVNFlow ajuda a pessoa usuária a receber alterações que já foram publicadas no SVN oficial.

Esse fluxo não usa pacote `.svnflow`.

O pacote `.svnflow` serve para transportar uma alteração antes da publicação. Depois que a alteração foi revisada, aplicada e publicada no SVN, a fonte oficial passa a ser o próprio SVN.

## Entrada do fluxo

O fluxo começa quando a pessoa clica no botão:

```text
Atualizar Base pelo SVN
```

Entrada mínima:

- checkout SVN configurado;
- diretório de trabalho SVN acessível;
- permissão local para executar atualização;
- pessoa usuária confirmou que deseja buscar alterações publicadas no SVN.

## Quando usar

Use este fluxo quando outra pessoa já publicou alterações no SVN oficial e a base local precisa ser atualizada antes de preparar uma nova alteração.

Exemplo:

```text
Nícolas aplica um pacote .svnflow
↓
Nícolas revisa e publica no SVN
↓
Marco atualiza a base pelo SVN
↓
Marco continua trabalhando a partir da base recente
```

Nesse cenário, Marco não precisa receber outro pacote `.svnflow` para a alteração já publicada. Ele deve receber a mudança pelo SVN.

## Validações antes da atualização

Antes de executar a atualização, o SVNFlow deve validar:

- se existe checkout SVN configurado;
- se o diretório configurado existe;
- se o diretório é um checkout SVN válido;
- se há alterações locais não publicadas;
- se há arquivos em conflito;
- se a pessoa confirmou explicitamente a atualização.

Se houver alterações locais não publicadas, o app deve alertar a pessoa usuária antes de continuar.

O objetivo não é impedir todo cenário avançado, mas evitar atualização acidental em uma base local sem revisão.

## Atualização pelo SVN

Após validação e confirmação, o SVNFlow deve executar o equivalente a:

```text
svn update
```

O app deve mostrar:

- arquivos recebidos;
- arquivos atualizados;
- arquivos adicionados;
- arquivos removidos;
- conflitos, se existirem;
- revisão SVN resultante;
- `svn status` após a atualização.

Se a atualização falhar, o app deve mostrar erro claro e manter o fluxo em estado seguro.

## Base Git local

O Git local continua sendo o ambiente de preparação das alterações.

Depois de atualizar o checkout SVN, o SVNFlow deve orientar a atualização da base Git local a partir da base SVN recente.

Na v1, essa etapa deve ser assistida, protegida e não destrutiva.

O app não deve:

- fazer merge automático em branches de trabalho;
- sobrescrever alterações Git sem confirmação explícita;
- assumir que a branch Git atual é o destino da atualização;
- tratar Git como fonte oficial compartilhada.

Antes de qualquer ação que altere arquivos no ambiente Git, o app deve exigir:

- estado limpo ou estado permitido;
- prévia do que será alterado;
- confirmação explícita da pessoa usuária.

## Relação com o pacote `.svnflow`

O pacote `.svnflow` resolve colaboração antes da publicação.

O `svn update` resolve recebimento depois da publicação.

Isso mantém a separação:

- `.svnflow`: revisar e transportar uma alteração ainda não publicada;
- `patch.diff`: aplicar tecnicamente uma alteração aceita;
- commit SVN protegido: publicar no SVN oficial;
- **Atualizar Base pelo SVN**: receber alterações já publicadas.

## Falhas

Exemplos de falhas que devem ser tratadas:

- checkout SVN não encontrado;
- diretório configurado não é checkout SVN;
- alterações locais pendentes;
- conflito durante `svn update`;
- falha de conexão com o servidor SVN;
- permissão insuficiente;
- revisão não atualizada.

Em caso de falha, o SVNFlow deve:

- interromper o fluxo;
- não tentar corrigir conflitos automaticamente;
- mostrar mensagem objetiva;
- orientar revisão manual do checkout SVN;
- registrar a falha no histórico local, se esse fluxo estiver integrado ao histórico.

## Resultado após sucesso

Após atualizar com sucesso, o app deve mostrar:

- revisão SVN atual;
- resumo dos arquivos recebidos;
- `svn status`;
- próximo passo sugerido para manter a base Git local alinhada.

O próximo passo pode ser preparar nova alteração, atualizar a base Git local de forma assistida ou revisar conflitos caso o SVN tenha indicado algum estado que exija ação manual.

## Cenários da v1

A v1 deve cobrir:

- botão **Atualizar Base pelo SVN**;
- validação do checkout SVN;
- alerta para alterações locais não publicadas;
- execução assistida de `svn update`;
- exibição de arquivos recebidos e revisão SVN resultante;
- exibição de `svn status` ao final;
- orientação para atualizar a base Git local sem merge automático em branches de trabalho.
