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

## Modelo mínimo de registro (v1)

Para a v1, o histórico deve expor um modelo mínimo simples e serializável que suporte as telas do protótipo sem depender de um banco de dados complexo. Exemplo de registro em JSON (apenas referência):

```json
{
	"id": "uuid-v4-ou-hash",
	"tipo": "exportado|importado",
	"titulo": "Resumo curto do pacote",
	"branch": "feature/123-minha-alteracao",
	"autor": "nome <email@exemplo>",
	"data": "2026-06-10T15:23:00Z",
	"caminho_local": "./packages/2026-06-10-.../meu-pacote.svnflow",
	"arquivos": ["src/app/foo.py", "src/app/bar.py"],
	"status": "gerado|importado|aplicado|falhou",
	"evento_aplicacao": {
		"timestamp": "2026-06-10T15:30:00Z",
		"sucesso": true,
		"mensagem": "Aplicado com sucesso" 
	},
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

Descrição dos campos mínimos:
- `id`: identificador único do registro (UUID ou hash curto);
- `tipo`: indica se o registro veio de uma exportação ou de uma importação;
- `titulo`: título humano do pacote (p.ex. assunto do `pr.md`);
- `branch`: branch de origem no Git quando aplicável;
- `autor`: pessoa que gerou ou importou o pacote;
- `data`: timestamp ISO 8601 do evento principal (geração ou importação);
- `caminho_local`: referência ao arquivo `.svnflow` armazenado localmente (não duplicar conteúdo);
- `arquivos`: lista dos caminhos relativos dos arquivos afetados, usada para visualização;
- `status`: enum com estados do fluxo (ver seção abaixo);
- `evento_aplicacao`: opcional — registro da tentativa de aplicação do patch (`sucesso` booleano, timestamp e mensagem curta);
- `referencias`: vínculos entre exportação/importação quando aplicável (p.ex. export_id referencia o registro gerado na exportação original);
- `metadados`: campos livres para auxiliar debug (tamanho, hash, etc.).

O modelo deve ser considerado mínimo — implementações podem estender `metadados` ou adicionar campos UI-friendly, desde que mantenham compatibilidade com o protótipo.

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

## Status possíveis (detalhado)

- `gerado`: pacote criado pela ação de exportação localmente;
- `importado`: pacote trazido para a máquina via importação;
- `aplicado`: aplicação do `patch.diff` concluída com sucesso;
- `falhou`: falha em qualquer etapa (importação, aplicação, validação).

Regras importantes:
- Nunca marcar `aplicado` sem confirmação de sucesso na aplicação do `patch.diff`.
- `falhou` deve armazenar ao menos uma mensagem curta de erro e timestamp para triagem.

## Relação com pacotes exportados/importados

Cada registro no histórico representa um pacote `.svnflow`. O `caminho_local` deve apontar para o arquivo salvo; o histórico não precisa descompactar ou duplicar todo o conteúdo do pacote — basta metadados e a lista de arquivos para permitir visualização rápida.

Quando houver um fluxo export->import->aplicar, vinculamos os registros usando `referencias.export_id` / `referencias.import_id` para manter rastreabilidade local entre as operações.

## Registro de aplicação (sucesso/falha)

Ao tentar aplicar um pacote:
- Antes: criar/atualizar o registro com status `importado` (ou `gerado` se a máquina for a origem);
- Durante: ao iniciar aplicação, registrar tentativa com `evento_aplicacao.timestamp`;
- Sucesso: setar `status` = `aplicado` e preencher `evento_aplicacao.sucesso = true` e `mensagem` apropriada;
- Falha: setar `status` = `falhou`, preencher `evento_aplicacao.sucesso = false` e gravar `mensagem` de erro curta e opcionalmente um campo de `detalhes` para diagnóstico.

A aplicação não deve apagar o pacote local nem o registro ao falhar — o operador deve poder inspecionar e tentar nova aplicação.

## Possibilidade de registrar atualização pelo SVN

O histórico local pode opcionalmente registrar eventos relacionados ao SVN (p.ex. `svn update` detectado antes/ depois da aplicação). Esses eventos devem ficar em `metadados.svn` e serem opcionais, sem dependência para determinar o status principal do pacote.

## Armazenamento sugerido para a v1

Recomendação prática para protótipo v1:
- usar um arquivo JSON simples (lista de registros) ou um diretório com arquivos JSON por registro. Isso evita a complexidade de bancos e facilita inspeção manual.
- alternativa leve: SQLite local (única tabela) se houver preocupação com concorrência ou performance. Não escolher soluções distribuídas ou servidores.

Observação: o documento descreve formato e funcionamento do histórico local do protótipo, não uma decisão de arquitetura definitiva.

## Limites e responsabilidades da v1

O histórico local v1 NÃO deve:
- ser tratado como auditoria oficial ou prova legal;
- sincronizar registros entre máquinas;
- depender de servidor externo;
- armazenar código corporativo fora do pacote `.svnflow`;
- substituir mecanismos de revisão formais (Git, SVN) ou revisão humana.

## Falhas esperadas e tratamento UX

O app deve lidar com casos como:
- pacote ausente do `caminho_local` (mostrar aviso e manter registro com nota `arquivo ausente`);
- pacote movido (tentar heurísticas de localização ou instruir o usuário a reimportar);
- pacote corrompido (marcar `falhou` e armazenar erro);
- `pr.md` interno ausente (mostrar mensagem contextual ao abrir registro);
- tentativa de transição de status inválida (bloquear e instruir usuário).

## Critérios de aceite (para esta issue)

- criar ou atualizar o documento Markdown com o modelo mínimo (`docs/fluxos/historico-local-pacotes.md`);
- definir claramente os campos mínimos e um exemplo de registro;
- descrever os status e regras de transição básicas;
- explicar relação com pacotes exportados/importados e como registrar aplicação com sucesso/falha;
- apresentar opção simples de armazenamento (arquivo JSON ou SQLite leve) e afirmar que não se trata de auditoria;
- não usar conteúdo corporativo real no exemplo.

---

## Cenários cobertos pela v1 (recapitulação)

- registrar pacote exportado;
- registrar pacote importado;
- atualizar status para aplicado;
- atualizar status para falhou;
- renderizar `pr.md` ao abrir um registro;
- exibir mensagem quando o pacote referenciado não existir mais.
