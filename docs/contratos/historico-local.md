# Histórico Local

## Objetivo

O histórico local permite consultar pacotes `.svnflow` exportados, importados e aplicados pela aplicação.

Na V1, ele deve ser simples, local e voltado para apoio operacional. Ele não substitui auditoria oficial, histórico Git, histórico SVN ou revisão humana.

Este documento define o modelo mínimo esperado para o protótipo e para a primeira implementação da V1. Ele não escolhe banco de dados definitivo.

## Princípios

- O histórico registra metadados e referências locais, não o conteúdo completo do pacote.
- Cada registro representa um pacote `.svnflow` ou um evento relevante ligado a esse pacote.
- O caminho local do pacote deve ser tratado como referência, não como fonte garantida.
- Falhas de leitura, validação ou aplicação devem ser registradas sem apagar o histórico.
- O histórico local não deve armazenar código corporativo fora do pacote `.svnflow`.

## Modelo mínimo de registro

Exemplo de registro em JSON, apenas como referência de contrato:

```json
{
  "id": "uuid-v4-ou-hash",
  "tipo": "exportado",
  "titulo": "Resumo curto do pacote",
  "branch": "feature/minha-alteracao",
  "autor": "Nome <email@exemplo.com>",
  "data": "2026-06-10T15:23:00Z",
  "caminho_local": "./packages/meu-pacote.svnflow",
  "arquivos": ["src/app/foo.py", "src/app/bar.py"],
  "status": "gerado",
  "evento_aplicacao": null,
  "referencias": {
    "export_id": null,
    "import_id": null
  },
  "metadados": {
    "tamanho_bytes": 34567,
    "hash_pacote": "sha256:..."
  }
}
```

## Campos

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `id` | Sim | Identificador único do registro, como UUID ou hash curto. |
| `tipo` | Sim | Origem do registro: `exportado` ou `importado`. |
| `titulo` | Sim | Título humano do pacote, normalmente derivado do `pr.md`. |
| `branch` | Quando houver | Branch Git de origem da alteração. |
| `autor` | Quando houver | Pessoa que gerou ou importou o pacote. |
| `data` | Sim | Timestamp ISO 8601 do evento principal. |
| `caminho_local` | Sim | Caminho local do arquivo `.svnflow`. |
| `arquivos` | Sim | Lista de arquivos afetados para visualização rápida. |
| `status` | Sim | Estado atual do registro. |
| `evento_aplicacao` | Não | Última tentativa de aplicação do pacote. |
| `referencias` | Não | Vínculos locais entre exportação e importação. |
| `metadados` | Não | Dados auxiliares, como tamanho, hash e informações de diagnóstico. |

Implementações podem adicionar campos auxiliares, desde que preservem esses campos mínimos e não dependam de servidor externo.

## Status possíveis

| Status | Significado |
| --- | --- |
| `gerado` | Pacote criado pela ação de exportação local. |
| `importado` | Pacote recebido e validado para revisão local. |
| `aplicado` | `patch.diff` aplicado com sucesso no checkout SVN. |
| `falhou` | Falha durante importação, validação, aplicação ou leitura do pacote. |

O app nunca deve marcar um pacote como `aplicado` sem confirmação de sucesso na aplicação do `patch.diff`.

Quando o status for `falhou`, o registro deve armazenar pelo menos uma mensagem curta de erro e um timestamp para triagem.

## Transições básicas

```text
Exportar alteração -> gerado
Importar pacote -> importado
Aplicar patch com sucesso -> aplicado
Falha na importação, validação ou aplicação -> falhou
```

Transições inválidas devem ser bloqueadas com mensagem clara. A aplicação não deve apagar o pacote local nem remover o registro ao falhar.

## Registro de aplicação

Ao tentar aplicar um pacote, o histórico deve registrar a tentativa em `evento_aplicacao`.

Formato mínimo:

```json
{
  "timestamp": "2026-06-10T15:30:00Z",
  "sucesso": true,
  "mensagem": "Aplicado com sucesso"
}
```

Em caso de falha, `sucesso` deve ser `false` e `mensagem` deve explicar a causa de forma curta, por exemplo:

```json
{
  "timestamp": "2026-06-10T15:30:00Z",
  "sucesso": false,
  "mensagem": "O patch não encaixa no checkout SVN selecionado"
}
```

## Relação com pacotes

Cada registro deve apontar para o arquivo `.svnflow` salvo localmente por meio de `caminho_local`.

O histórico não precisa descompactar nem duplicar todo o conteúdo do pacote. Para visualização rápida, ele pode armazenar título, lista de arquivos, hash e metadados do pacote.

Quando houver um fluxo de exportação, importação e aplicação do mesmo pacote, `referencias.export_id` e `referencias.import_id` podem ser usados para manter rastreabilidade local entre registros.

## Eventos de SVN

O histórico local pode registrar eventos relacionados ao SVN, como `svn update` antes ou depois de uma aplicação.

Esses eventos devem ficar em `metadados.svn` e ser opcionais. Eles não devem determinar sozinhos o status principal do pacote.

## Armazenamento sugerido para V1

Para a V1, o armazenamento deve ser simples:

- arquivo JSON com lista de registros; ou
- diretório local com um arquivo JSON por registro.

SQLite local pode ser considerado se houver necessidade clara de concorrência, busca ou volume maior de dados. Servidor externo, sincronização entre máquinas e soluções distribuídas ficam fora da V1.

## Visualização esperada

A tela de histórico deve permitir:

- listar pacotes em ordem recente;
- identificar pacotes por status;
- abrir o registro de um pacote;
- renderizar o `pr.md` interno do pacote;
- mostrar o caminho local do pacote;
- mostrar arquivos afetados;
- exibir aviso quando o pacote referenciado não existir mais.

## Falhas esperadas

O app deve lidar com:

- pacote removido do caminho local;
- pacote movido;
- pacote corrompido;
- `pr.md` interno ausente;
- status anterior incompatível com a ação atual;
- falha de permissão ao gravar o histórico;
- registro local inconsistente.

Nesses casos, o app deve mostrar erro claro e preservar o registro local quando possível.

## Limites da V1

O histórico local da V1 não deve:

- ser tratado como auditoria oficial;
- sincronizar dados entre máquinas;
- depender de servidor externo;
- armazenar conteúdo completo de código fora do pacote `.svnflow`;
- substituir Git, SVN, Pull Request ou revisão humana;
- escolher banco de dados definitivo para versões futuras.
