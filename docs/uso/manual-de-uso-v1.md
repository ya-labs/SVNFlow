# Manual de Uso da V1

## Objetivo

Este manual descreve como a V1 do SVNFlow deve ser usada em dois cenários:

- trabalho solo;
- colaboração por pacote `.svnflow`.

O trabalho solo é o fluxo padrão da V1. A colaboração é uma camada adicional para transportar e revisar alterações por pacote, sem transformar o SVNFlow em plataforma colaborativa completa.

## Premissas de Segurança

Antes de qualquer operação sensível, o SVNFlow deve mostrar o estado do ambiente e bloquear avanço inseguro.

Premissas:

- o app opera localmente;
- o SVN continua sendo o destino oficial de publicação;
- o Git é usado como apoio local de organização;
- o app não deve enviar código para servidor externo;
- exemplos e mensagens devem ser genéricos;
- aplicar alteração no checkout SVN não é a mesma coisa que publicar commit SVN.

## Quando Usar Cada Trilha

Use a trilha de trabalho solo quando a mesma pessoa prepara, revisa e leva a alteração ao checkout SVN.

Use a trilha de colaboração quando uma pessoa prepara uma alteração e outra pessoa precisa revisar, importar ou aplicar essa alteração por pacote `.svnflow`.

## Trilha 1: Trabalho Solo

Esta é a jornada principal da V1.

```text
Validar ambiente
  -> selecionar ou cadastrar ambiente salvo
  -> escolher branch e base
  -> gerar preview
  -> revisar arquivos afetados
  -> aplicar no checkout SVN
  -> consultar svn status
  -> revisar commit SVN protegido
  -> consultar histórico local
```

### 1. Validar Ambiente

A pessoa seleciona ou confirma:

- ambiente salvo, quando existir;
- workspace Git local;
- checkout SVN local.

Um ambiente salvo é um atalho local com apelido amigável, workspace Git e checkout SVN já conhecidos pelo app.

O app deve mostrar:

- se Git está disponível;
- se SVN está disponível;
- se o workspace Git é válido;
- se o checkout SVN é válido;
- URL e revisão SVN detectadas, quando disponíveis;
- quais bloqueios impedem o avanço.

### 1.1. Cadastrar Ambiente Salvo

Quando ainda não existir um ambiente salvo, a pessoa deve poder cadastrar um novo ambiente selecionando pastas locais.

O app deve solicitar:

- nome amigável do ambiente;
- pasta do workspace Git;
- pasta do checkout SVN.

Depois da seleção, o app deve validar os caminhos e detectar metadados do SVN com leitura local, como `svn info`.

O app não deve exigir que a pessoa informe manualmente o nome técnico do repositório SVN remoto. A escolha deve acontecer pela pasta local do checkout e por um apelido compreensível.

### 2. Preparar Workspace Git

A pessoa confirma a branch de origem e a base de comparação.

O app deve mostrar:

- branch atual;
- base usada para comparação;
- estado do repositório;
- bloqueios como branch não detectada ou estado inseguro.

### 3. Gerar Preview

Antes de aplicar qualquer alteração, o app deve mostrar:

- arquivos criados;
- arquivos modificados;
- arquivos removidos;
- riscos ou limitações;
- resumo da alteração.

O objetivo do preview é permitir revisão antes de alterar o checkout SVN.

### 4. Aplicar no Checkout SVN

Depois da revisão e confirmação, o app aplica a alteração no checkout SVN validado.

O app deve deixar claro que:

- a operação altera arquivos locais do checkout SVN;
- a operação ainda não publica no SVN;
- falhas de patch ou conflito devem bloquear o avanço automático.

### 5. Consultar `svn status`

Após aplicar a alteração, o app deve exibir o estado do checkout SVN.

O app deve traduzir o resultado para uma leitura compreensível, indicando:

- arquivos modificados;
- arquivos adicionados;
- arquivos removidos;
- conflitos;
- se o estado está pronto para revisão ou commit.

### 6. Revisar Commit SVN Protegido

O commit SVN é uma etapa separada.

Antes de publicar, o app deve mostrar:

- arquivos que serão publicados;
- mensagem de commit;
- aviso de publicação no SVN;
- confirmação explícita.

O commit não deve acontecer automaticamente depois da aplicação.

### 7. Consultar Histórico Local

O histórico local ajuda a consultar o que foi gerado, importado ou aplicado.

Ele não é auditoria oficial.

## Trilha 2: Colaboração por Pacote `.svnflow`

Esta trilha serve para colaboração local sem criar servidor próprio ou repositório Git compartilhado obrigatório.

```text
Pessoa A exporta pacote .svnflow
  -> pacote é enviado por canal permitido fora do app
  -> Pessoa B importa pacote .svnflow
  -> Pessoa B revisa pr.md
  -> Pessoa B valida patch e checkout SVN
  -> Pessoa B aplica no checkout SVN
  -> Pessoa B consulta svn status
  -> Pessoa B segue para commit SVN protegido quando adequado
```

### 1. Exportar Pacote

A pessoa que preparou a alteração gera um pacote `.svnflow`.

O pacote deve conter:

- `manifest.json`;
- `pr.md`;
- `patch.diff`.

O app deve mostrar o que entrará no pacote antes da exportação.

### 2. Enviar Pacote

O SVNFlow não define o canal de envio.

O pacote deve ser compartilhado apenas por canais permitidos pela organização ou pelo contexto de uso.

O app não deve enviar código para servidor externo na V1.

### 3. Importar Pacote

A pessoa que recebeu o pacote importa o arquivo `.svnflow`.

O app deve validar:

- se o pacote pode ser aberto;
- se os arquivos obrigatórios existem;
- se a versão do formato é suportada;
- se o `pr.md` pode ser renderizado;
- se o `patch.diff` existe.

### 4. Revisar `pr.md`

Antes de aplicar a alteração, a pessoa deve revisar:

- título;
- contexto;
- o que mudou;
- observações;
- arquivos afetados.

O `pr.md` ajuda na revisão, mas não substitui políticas oficiais de aprovação.

### 5. Aplicar e Validar

Depois da revisão, o app valida o checkout SVN e aplica o patch somente com confirmação explícita.

Após a aplicação, o app deve mostrar `svn status`.

### 6. Seguir Para Commit SVN

Quando o estado estiver adequado, a pessoa pode seguir para o commit SVN protegido.

O commit continua separado da importação e da aplicação do pacote.

## O Que o App Deve Mostrar Antes de Alterar Arquivos

Antes de qualquer operação que altere arquivos, o app deve mostrar:

- destino da alteração;
- arquivos afetados;
- tipo de alteração;
- estado do checkout SVN;
- riscos detectados;
- mensagem clara de confirmação.

## Diferença Entre Aplicar e Publicar

Aplicar alteração no checkout SVN:

- altera arquivos locais;
- permite revisão posterior;
- não publica no SVN oficial.

Publicar commit SVN:

- envia alterações para o SVN;
- altera o histórico oficial;
- exige confirmação explícita.

## Limites da V1

A V1 não pretende:

- substituir Git, SVN ou GitHub;
- criar colaboração completa equivalente a Pull Request;
- criar servidor central;
- resolver conflitos automaticamente;
- automatizar merge ou rebase avançado;
- enviar código para servidor externo;
- executar commit SVN automático.

## Critérios de Clareza Para Uso Solo

O modo solo deve ser considerado claro quando a pessoa usuária entende:

- qual ambiente salvo está em uso, quando houver;
- onde está o workspace Git;
- onde está o checkout SVN;
- qual branch está sendo usada;
- qual base gera a comparação;
- quais arquivos serão alterados;
- quando arquivos locais serão modificados;
- quando uma publicação SVN acontecerá;
- o que fazer quando o app bloquear uma etapa.
