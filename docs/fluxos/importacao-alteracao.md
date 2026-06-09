# Importação de Alteração

## Objetivo

A importação de alteração permite que uma pessoa receba um pacote `.svnflow`, revise seu conteúdo e decida se aceita ou cancela a alteração.

Importar um pacote não deve aplicar alterações automaticamente no checkout SVN.

## Entrada do fluxo

O fluxo começa quando a pessoa seleciona:

```text
Importar Alteração
```

Em seguida, o SVNFlow deve permitir selecionar um arquivo `.svnflow` local.

## Validações iniciais

Antes de mostrar a prévia, o app deve validar:

- se o arquivo existe;
- se a extensão é `.svnflow`;
- se o pacote pode ser aberto como ZIP renomeado;
- se o pacote contém `manifest.json`;
- se o pacote contém `pr.md`;
- se o pacote contém `patch.diff`;
- se a versão do pacote é suportada;
- se os metadados mínimos podem ser lidos.

Se alguma validação falhar, o app deve bloquear o fluxo e mostrar uma mensagem objetiva.

## Prévia

Após validar o pacote, o SVNFlow deve exibir uma prévia antes de qualquer aceite.

A prévia deve mostrar:

- `pr.md` renderizado;
- autor;
- branch de origem da alteração;
- base de comparação usada para gerar o patch, quando disponível;
- destino de aplicação previsto, quando disponível;
- título;
- arquivos afetados;
- data de exportação;
- versão do pacote;
- status inicial do pacote.

O objetivo da prévia é permitir revisão humana antes de qualquer alteração no checkout SVN.

## Ações disponíveis

Na v1, a tela de importação deve oferecer:

- `Aceitar`: confirma que o pacote pode seguir para a etapa de aplicação;
- `Cancelar`: encerra a importação sem alterar arquivos;
- `Abrir localização`: opcional, para abrir a pasta do pacote importado.

A ação `Aceitar` não deve executar commit SVN.

## Registro local

Ao importar um pacote válido, o SVNFlow deve criar um registro local simples.

Campos mínimos:

- tipo: importado;
- título;
- branch de origem;
- base de comparação;
- destino de aplicação, quando informado;
- autor;
- data de importação;
- caminho local do pacote;
- lista de arquivos;
- status: importado.

Se a importação falhar, o app pode registrar o status `falhou`, desde que não registre conteúdo sensível.

## Saída do fluxo

Quando a pessoa aceita a importação, o pacote fica pronto para a próxima etapa:

```text
Aplicar na dev
```

Essa etapa deve validar e aplicar o `patch.diff` no checkout SVN em um fluxo separado.

## Cenários da v1

A v1 deve cobrir:

- importar pacote `.svnflow` válido;
- bloquear pacote inválido;
- renderizar `pr.md`;
- mostrar arquivos afetados;
- permitir cancelar sem alterar arquivos;
- registrar pacote importado no histórico local;
- manter aplicação do patch separada da importação.
