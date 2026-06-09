# Exportação de Alteração

## Objetivo

A tela de exportação transforma uma alteração Git em um pacote `.svnflow` revisável.

Na v1, essa tela deve funcionar como uma mini PR local: a pessoa preenche campos simples, revisa os arquivos afetados e gera um pacote que pode ser enviado para outra pessoa.

O SVNFlow deve transformar os campos preenchidos em um `pr.md` padronizado dentro do pacote `.svnflow`.

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
| Contexto | Pessoa usuária | Sim | Campo simples explicando o motivo da alteração. |
| O que mudou | Pessoa usuária | Sim | Campo simples descrevendo as mudanças. |
| Observações | Pessoa usuária | Não | Campo simples para riscos, dúvidas ou pontos de revisão. |
| Autor | Automática, revisável | Sim | Sugerido pelo ambiente Git quando possível. |
| Arquivos alterados | Automática | Sim | Gerado pelo app, sem edição manual na v1. |

## Prévia

A tela deve permitir alternar entre edição dos campos e prévia do Markdown gerado.

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

## Markdown gerado

Ao gerar o pacote, o SVNFlow deve criar um `pr.md` interno usando os campos preenchidos.

Modelo conceitual:

```md
# Corrige tooltip do checkout

## Branch

5647-bug001

## Autor

Marco

## Arquivos alterados

- checkout.controller.js
- desconto.service.js

## Contexto

Durante a revisão do checkout, foi identificado que o tooltip não deixava clara a regra de desconto.

## O que mudou

- Ajustado texto do tooltip.
- Mantido comportamento atual do cálculo.

## Observações

- Alteração visual simples.
```

O `pr.md` deve ficar dentro do pacote `.svnflow`. A v1 não deve salvar vários arquivos Markdown separados como fonte principal do histórico.

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
- `pr.md` gerado a partir dos campos preenchidos;
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

Ao abrir um item do histórico, o app deve usar o caminho local do pacote para renderizar o `pr.md` interno.

## Cenários da v1

A v1 deve cobrir:

- exportação com branch detectada automaticamente;
- campos obrigatórios bloqueando exportação inválida;
- observações vazias permitidas;
- Markdown gerado a partir dos campos estruturados;
- `pr.md` interno renderizado na prévia;
- pacote `.svnflow` gerado com metadados preenchidos;
- registro local criado após exportação.
