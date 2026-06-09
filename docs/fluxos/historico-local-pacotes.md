# Histórico Local de Pacotes

## Objetivo

O histórico local permite consultar pacotes `.svnflow` exportados e importados pela aplicação.

Na v1, ele deve ser simples, local e voltado para apoio operacional. Ele não substitui auditoria oficial, histórico Git ou histórico SVN.

## O que o histórico registra

Cada registro deve representar um pacote `.svnflow`.

Campos mínimos:

- tipo: exportado ou importado;
- título;
- branch;
- autor;
- data;
- caminho local do pacote;
- lista de arquivos afetados;
- status.

Status previstos:

- `gerado`;
- `importado`;
- `aplicado`;
- `falhou`.

## Visualização

A tela de histórico deve permitir:

- listar pacotes em ordem recente;
- filtrar ou identificar pacotes por status;
- abrir o registro de um pacote;
- renderizar o `pr.md` interno do pacote;
- mostrar o caminho local do pacote;
- mostrar arquivos afetados.

O histórico deve usar o caminho local do pacote como referência. Ele não precisa duplicar o conteúdo completo do `.svnflow`.

## Atualização de status

O status deve mudar conforme o fluxo:

```text
Exportar Alteração -> gerado
Importar Alteração -> importado
Aplicar na dev com sucesso -> aplicado
Falha na importação ou aplicação -> falhou
```

O app deve evitar marcar um pacote como `aplicado` antes da aplicação bem-sucedida do `patch.diff`.

## Limites da v1

Na v1, o histórico local não deve:

- ser tratado como auditoria oficial;
- sincronizar dados entre máquinas;
- depender de servidor externo;
- armazenar código corporativo fora do pacote `.svnflow`;
- substituir Git, SVN ou revisão humana.

## Falhas esperadas

O app deve lidar com situações como:

- pacote removido do caminho local;
- pacote movido;
- pacote corrompido;
- `pr.md` interno ausente;
- status anterior incompatível com a ação atual.

Nesses casos, o app deve mostrar erro claro e preservar o registro local quando possível.

## Cenários da v1

A v1 deve cobrir:

- registrar pacote exportado;
- registrar pacote importado;
- atualizar status para aplicado;
- atualizar status para falhou;
- renderizar `pr.md` ao abrir um registro;
- exibir mensagem quando o pacote referenciado não existir mais.
