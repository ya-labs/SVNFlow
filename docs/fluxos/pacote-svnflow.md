# Pacote `.svnflow`

## Objetivo

O pacote `.svnflow` é o formato inicial de colaboração da v1.

Ele permite que uma pessoa exporte uma alteração preparada no Git e que outra pessoa importe, revise e aplique essa alteração em um checkout SVN de desenvolvimento.

O pacote não substitui Git, SVN ou Pull Request. Ele funciona como uma mini PR transportável: reúne contexto, mudanças, observações, arquivos afetados e conteúdo técnico necessário para aplicar a alteração.

## Fluxo

```text
Pessoa A
↓
Exportar Alteração
↓
Preencher mini PR local
↓
5647-bug001.svnflow
↓
Pessoa B
↓
Importar Alteração
↓
Revisar autor, arquivos e resumo
↓
Aceitar
↓
Aplicar na dev
```

## Conteúdo conceitual

Internamente, o pacote deve conter:

- patch da alteração;
- metadados da alteração;
- lista de arquivos afetados;
- título legível para revisão;
- contexto informado em Markdown;
- descrição do que mudou em Markdown;
- observações opcionais em Markdown;
- informações mínimas para validação antes da aplicação.

Um pacote pode ser representado conceitualmente assim:

```text
5647-bug001.svnflow
|-- patch
|-- metadados
|-- arquivos
`-- descricao
```

O formato físico ainda deve ser validado no protótipo. Pode ser um arquivo compactado com manifesto interno, desde que continue simples de gerar, importar e validar.

## Metadados mínimos

A v1 deve considerar estes metadados:

- identificador da tarefa ou alteração;
- título;
- autor;
- data de exportação;
- branch Git de origem;
- lista de arquivos criados, modificados e removidos;
- contexto informado pela pessoa autora;
- descrição do que mudou;
- observações opcionais;
- versão do formato `.svnflow`;
- checksum ou validação equivalente do conteúdo do pacote.

A branch Git deve ser detectada automaticamente no momento da exportação. O nome sugerido do arquivo deve usar essa branch, por exemplo:

```text
Branch: 5647-bug001
Pacote sugerido: 5647-bug001.svnflow
```

## Prévia na importação

Ao importar um pacote, o SVNFlow deve mostrar uma tela objetiva antes de qualquer aplicação:

```text
Autor: Marco
Branch: 5647-bug001

Arquivos:
- checkout.controller.js
- desconto.service.js

Título:
Corrige tooltip do checkout

Contexto:
Durante a revisão do checkout, foi identificado que o tooltip não deixava clara a regra de desconto.

O que mudou:
- Ajustado texto do tooltip.
- Mantido comportamento atual do cálculo.

Observações:
- Alteração visual simples.
```

A pessoa usuária deve conseguir revisar o conteúdo antes de aceitar.

## Registro local

Ao exportar ou importar um pacote, o SVNFlow deve criar um registro local simples com metadados.

Esse registro serve para consulta dentro da aplicação, não para auditoria oficial.

Campos mínimos do registro:

- tipo: exportado ou importado;
- título;
- branch;
- autor;
- data;
- caminho local do pacote;
- lista de arquivos;
- status: gerado, importado, aplicado ou falhou.

Na v1, o registro local não precisa duplicar o conteúdo completo do pacote. Ele deve guardar apenas metadados e referência para o arquivo local.

## Regras de segurança

Antes de aplicar um pacote, o app deve validar:

- se o checkout SVN de destino existe;
- se o checkout SVN está limpo ou em estado permitido;
- se o pacote é válido;
- se a versão do formato é suportada;
- se os arquivos do pacote ainda fazem sentido no destino;
- se há risco claro de conflito;
- se a pessoa confirmou a aplicação.

O app não deve aplicar alteração automaticamente ao importar o arquivo.

## Aplicação na dev

Depois do aceite, o SVNFlow aplica a alteração no checkout SVN de desenvolvimento.

Após aplicar, o app deve mostrar:

- resultado da aplicação;
- arquivos afetados;
- `svn status` atualizado;
- possíveis conflitos ou falhas;
- próximo passo sugerido.

O commit SVN deve continuar protegido por confirmação explícita e pode ficar fora do primeiro protótipo funcional se isso acelerar a entrega segura da v1.

## Pontos a validar

Antes de estabilizar o formato `.svnflow`, o projeto precisa validar:

- alterações simples em arquivos de texto;
- criação de arquivo;
- remoção de arquivo;
- renomeação de arquivo;
- arquivos binários;
- conflito por arquivo alterado no destino;
- diferenças de encoding;
- diferenças de fim de linha;
- pacote gerado em uma máquina e importado em outra.
