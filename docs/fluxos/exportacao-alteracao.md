# Exportação de Alteração

## Objetivo

A tela de exportação transforma uma alteração Git em um pacote `.svnflow` revisável.

Na v1, essa tela deve funcionar como uma mini PR local: a pessoa descreve o contexto, explica o que mudou, revisa os arquivos afetados e gera um pacote que pode ser enviado para outra pessoa.

## Entrada do fluxo

O fluxo começa quando a pessoa seleciona:

```text
Exportar Alteração
```

Antes de abrir a tela, o SVNFlow deve buscar automaticamente:

- branch Git atual;
- autor sugerido, quando disponível;
- arquivos alterados;
- caminho do projeto Git;
- nome sugerido do pacote.

O nome sugerido do pacote deve ser baseado na branch:

```text
Branch: 5647-bug001
Pacote sugerido: 5647-bug001.svnflow
```

## Formulário

A tela deve conter os seguintes campos:

| Campo | Origem | Obrigatório | Observação |
| --- | --- | --- | --- |
| Branch | Automática | Sim | Detectada do Git e não deve começar vazia. |
| Título | Pessoa usuária | Sim | Título curto da alteração. |
| Contexto | Pessoa usuária | Sim | Campo em Markdown explicando o motivo da alteração. |
| O que mudou | Pessoa usuária | Sim | Campo em Markdown descrevendo as mudanças. |
| Observações | Pessoa usuária | Não | Campo em Markdown para riscos, dúvidas ou pontos de revisão. |
| Autor | Automática, revisável | Sim | Sugerido pelo ambiente Git quando possível. |
| Arquivos alterados | Automática | Sim | Gerado pelo app, sem edição manual na v1. |

## Prévia

A tela deve permitir alternar entre edição e prévia renderizada em Markdown.

A prévia deve mostrar:

```text
Título
Branch
Autor
Arquivos alterados
Contexto
O que mudou
Observações
```

O objetivo da prévia é deixar a alteração fácil de revisar antes de gerar o pacote.

## Validações

O SVNFlow deve bloquear a geração do pacote quando:

- a branch não for detectada;
- o título estiver vazio;
- o contexto estiver vazio;
- o campo `O que mudou` estiver vazio;
- não houver arquivos alterados para exportar.

Observações podem ficar vazias.

## Geração do pacote

Ao confirmar a exportação, o SVNFlow deve gerar um arquivo `.svnflow` contendo:

- metadados da mini PR local;
- lista de arquivos afetados;
- conteúdo técnico necessário para transportar a alteração;
- dados mínimos para validação na importação.

Depois de gerar o pacote, o app deve mostrar:

- caminho do arquivo gerado;
- data da exportação;
- status `gerado`;
- opção de abrir a pasta do pacote;
- opção de copiar o caminho do pacote.

## Histórico local

Toda exportação deve criar um registro local simples.

Campos mínimos:

- tipo: exportado;
- título;
- branch;
- autor;
- data;
- caminho local do pacote;
- lista de arquivos;
- status: gerado.

Esse histórico serve para consulta dentro da aplicação. Ele não deve ser tratado como auditoria oficial da empresa ou substituto do SVN.

## Cenários da v1

A v1 deve cobrir:

- exportação com branch detectada automaticamente;
- campos obrigatórios bloqueando exportação inválida;
- observações vazias permitidas;
- Markdown renderizado na prévia;
- pacote `.svnflow` gerado com metadados preenchidos;
- registro local criado após exportação.
