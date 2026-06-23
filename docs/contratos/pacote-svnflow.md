# Contrato do Pacote `.svnflow`

## Objetivo

O pacote `.svnflow` é o formato inicial de colaboração da v1.

Ele permite que uma pessoa exporte uma alteração preparada no Git e que outra pessoa importe, revise e aplique essa alteração em um checkout SVN de desenvolvimento.

O pacote não substitui Git, SVN ou Pull Request. Ele funciona como uma mini PR transportável: reúne contexto, mudanças, observações, arquivos afetados, um `pr.md` padronizado e o patch necessário para aplicar a alteração.

Na v1, o `.svnflow` é um arquivo ZIP renomeado.

## Fluxo

```text
Pessoa A
↓
Gerar Preview do Workspace
↓
Abrir Pacotes
↓
Preencher Mini PR Local
↓
Exportar Pacote
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

- `patch.diff` com a alteração técnica aplicável;
- `manifest.json` com metadados da alteração;
- `pr.md` gerado a partir dos campos estruturados da exportação;
- lista de arquivos afetados;
- informações mínimas para validação antes da aplicação.

Um pacote pode ser representado conceitualmente assim:

```text
5647-bug001.svnflow
|-- pr.md
|-- manifest.json
|-- patch.diff
`-- files/
```

A pasta `files/` fica reservada para casos futuros, como arquivos binários ou cenários em que patch não for suficiente. Na v1, a alteração técnica deve ser transportada primeiro por `patch.diff`.

## Relação com Preview e Pacotes

O Preview é a fonte técnica da alteração.

Ele fornece:

- branch de origem;
- base de comparação;
- arquivos afetados;
- diferenças usadas para gerar o `patch.diff`;
- riscos ou limitações detectadas.

A etapa Pacotes é a fonte humana e operacional do pacote.

Ela deve concentrar:

- exportação do pacote a partir de um preview válido;
- preenchimento dos campos estruturados que geram o `pr.md`;
- escolha ou confirmação da pasta local de pacotes;
- listagem de pacotes recentes, exportados e importados;
- importação e validação de pacotes existentes;
- revisão do `pr.md` antes da aplicação.

Essa separação evita que o Preview misture revisão técnica do workspace com edição de mini PR. O Preview pode sugerir dados para o pacote, mas não deve ser a tela principal de preenchimento do `pr.md`.

## Transporte por patch

O `patch.diff` é a receita da alteração.

A pessoa usuária não deve editar arquivos manualmente ao importar um pacote. O SVNFlow deve aplicar o patch no checkout SVN depois da validação e do aceite explícito.

Se o patch não encaixar no destino, o app deve bloquear a aplicação e mostrar erro claro, sem sobrescrever arquivos automaticamente.

## Metadados mínimos

A v1 deve considerar estes metadados:

- identificador da tarefa ou alteração;
- título;
- autor;
- data de exportação;
- branch de origem da alteração;
- base de comparação usada para gerar o patch;
- destino de aplicação previsto, quando informado;
- lista de arquivos criados, modificados e removidos;
- dados estruturados usados para gerar o `pr.md`;
- versão do formato `.svnflow`;
- checksum ou validação equivalente do conteúdo do pacote.

Na V1, os dados técnicos devem vir do Preview validado e os dados humanos devem vir da etapa Pacotes.

Campos técnicos:

- branch de origem;
- base de comparação;
- lista de arquivos;
- artefatos gerados;
- checksum ou hash equivalente;
- versão do formato.

Campos humanos:

- título;
- contexto;
- o que mudou;
- observações;
- autor quando informado ou detectado.

A branch de origem deve ser detectada automaticamente no momento da exportação. Ela serve para rastreabilidade, não como destino de aplicação.

A base de comparação deve indicar de onde o `patch.diff` foi gerado, normalmente `main` local. O destino de aplicação é o checkout SVN escolhido na importação ou aplicação.

O nome sugerido do arquivo pode usar a branch de origem, por exemplo:

```text
Branch de origem: 5647-bug001
Base de comparação: main
Destino de aplicação: checkout SVN/dev
Pacote sugerido: 5647-bug001.svnflow
```

O pacote `.svnflow` não representa uma branch Git de destino. Ele representa uma alteração exportada a partir de uma branch de origem, comparada contra uma base local, para ser aplicada depois em um checkout SVN.

## Prévia na importação

Ao importar um pacote na etapa Pacotes, o SVNFlow deve mostrar uma tela objetiva antes de qualquer aplicação:

```text
Autor: Marco
Branch de origem: 5647-bug001
Base de comparação: main
Destino de aplicação: checkout SVN/dev

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

Essa prévia deve ser gerada a partir do `pr.md` interno do pacote, renderizado pelo app para facilitar leitura.

## Pasta e listagem de pacotes

A V1 deve evitar depender apenas de digitação manual de caminho do arquivo `.svnflow`.

A etapa Pacotes deve priorizar:

- uma pasta local de pacotes configurada ou escolhida pela pessoa;
- listagem de pacotes encontrados nessa pasta;
- identificação visual de pacotes exportados e importados;
- opção de selecionar arquivo manualmente quando necessário;
- aviso claro quando o pacote referenciado não existir mais.

O app não deve buscar pacotes em servidor externo na V1.

## Registro local

Ao exportar ou importar um pacote, o SVNFlow deve criar um registro local simples com metadados.

Esse registro serve para consulta dentro da aplicação, não para auditoria oficial.

Campos mínimos do registro:

- tipo: exportado ou importado;
- título;
- branch de origem;
- base de comparação;
- destino de aplicação, quando informado;
- autor;
- data;
- caminho local do pacote;
- lista de arquivos;
- status: gerado, importado, aplicado ou falhou.

Na v1, o registro local não precisa duplicar o conteúdo completo do pacote. Ele deve guardar apenas metadados e referência para o arquivo local.

Quando a pessoa abrir um registro do histórico, o app deve localizar o pacote referenciado e renderizar o `pr.md` interno. O histórico não deve manter vários arquivos Markdown separados como fonte principal.

## Regras de segurança

Antes de aplicar um pacote, o app deve validar:

- se o checkout SVN de destino existe;
- se o checkout SVN está limpo ou em estado permitido;
- se o pacote é válido;
- se a versão do formato é suportada;
- se o `patch.diff` existe e pode ser interpretado;
- se os arquivos do pacote ainda fazem sentido no destino;
- se o patch encaixa no checkout SVN antes da aplicação;
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
