# Mapa de Etapas da v1

## Objetivo

Este documento organiza as etapas da v1 do SVNFlow até um protótipo usável.

O mapa deve orientar as próximas issues e evitar decisões fora de ordem. Ele não define stack, arquitetura final ou implementação definitiva.

## Critérios do mapa

Cada etapa deve ter:

- objetivo claro;
- saída esperada;
- critério de conclusão;
- status atual.

Status possíveis:

- `concluída`;
- `documentada`;
- `próxima`;
- `pendente`;
- `bloqueada`.

## Visão geral

```text
1. Base de decisão da v1
2. Fluxo de exportação
3. Fluxo de importação
4. Aplicação do patch
5. Histórico local simples
6. Commit SVN protegido
7. Protótipo técnico
```

## 1. Base de decisão da v1

Status: `concluída`

Objetivo:

Definir o recorte inicial da v1 e o contrato básico do pacote `.svnflow`.

Saída esperada:

- escopo da v1 documentado;
- contrato inicial do pacote documentado;
- pacote `.svnflow` definido como ZIP renomeado;
- transporte técnico definido por `patch.diff`.

Critério de conclusão:

- existir decisão de escopo da v1;
- existir decisão de contrato inicial do pacote `.svnflow`;
- a documentação principal apontar para essas decisões.

Documentos relacionados:

- [Decisão 0001: Escopo da v1](../decisoes/0001-escopo-v1.md)
- [Decisão 0002: Contrato inicial do pacote `.svnflow`](../decisoes/0002-contrato-inicial-pacote-svnflow.md)

## 2. Fluxo de exportação

Status: `documentada`

Objetivo:

Definir como uma pessoa transforma uma branch Git em um pacote `.svnflow` revisável.

Saída esperada:

- tela de exportação no modelo de mini PR local;
- branch detectada automaticamente;
- campos estruturados para título, contexto, mudanças e observações;
- geração de `pr.md` dentro do pacote;
- geração de `patch.diff`;
- registro local do pacote exportado.

Critério de conclusão:

- fluxo documentado;
- campos obrigatórios definidos;
- saída do pacote descrita;
- validações mínimas registradas.

Documento relacionado:

- [Exportação de alteração](../fluxos/exportacao-alteracao.md)

## 3. Fluxo de importação

Status: `próxima`

Objetivo:

Definir como uma pessoa importa um pacote `.svnflow`, revisa seu conteúdo e decide se aceita a alteração.

Saída esperada:

- tela para selecionar pacote `.svnflow`;
- validação da estrutura do pacote;
- renderização do `pr.md`;
- exibição de autor, branch, arquivos afetados e status do pacote;
- ação explícita para aceitar ou cancelar;
- registro local do pacote importado.

Critério de conclusão:

- fluxo de importação documentado;
- validações antes da aplicação definidas;
- estados de sucesso, cancelamento e falha descritos.

## 4. Aplicação do patch

Status: `documentada`

Objetivo:

Definir como o SVNFlow aplica o `patch.diff` no checkout SVN de desenvolvimento.

Saída esperada:

- validação de que o checkout SVN existe;
- validação de estado limpo ou estado permitido;
- verificação de encaixe do patch antes da aplicação;
- aplicação controlada do patch;
- exibição de `svn status` após sucesso;
- bloqueio claro em caso de falha.

Critério de conclusão:

- comportamento esperado documentado;
- falhas comuns descritas;
- prova técnica executada em projeto fictício.

Documento relacionado:

- [Aplicação do patch no checkout SVN](../fluxos/aplicacao-patch-svn.md)

## 5. Histórico local simples

Status: `pendente`

Objetivo:

Definir como o app lista pacotes exportados e importados sem criar auditoria oficial ou banco complexo.

Saída esperada:

- lista de pacotes exportados e importados;
- status do pacote: gerado, importado, aplicado ou falhou;
- caminho local do pacote;
- visualização do `pr.md` interno ao abrir um registro.

Critério de conclusão:

- armazenamento local simples decidido;
- campos mínimos do histórico documentados;
- limites do histórico local registrados.

## 6. Commit SVN protegido

Status: `pendente`

Objetivo:

Decidir se o commit SVN entra no protótipo inicial ou se permanece como etapa manual assistida.

Saída esperada:

- decisão sobre incluir ou não commit SVN na v1;
- confirmação explícita obrigatória antes de commit;
- comportamento esperado após aplicação do patch.

Critério de conclusão:

- decisão registrada em documento próprio;
- risco de publicação acidental tratado explicitamente.

## 7. Protótipo técnico

Status: `pendente`

Objetivo:

Validar o fluxo principal da v1 em um projeto fictício, sem conteúdo corporativo real.

Saída esperada:

- exportar pacote `.svnflow`;
- importar pacote `.svnflow`;
- renderizar `pr.md`;
- aplicar `patch.diff` em checkout SVN de teste;
- exibir `svn status`;
- registrar histórico local simples.

Critério de conclusão:

- fluxo validado em ambiente fictício;
- erros principais identificados;
- limitações da v1 documentadas;
- decisão de stack e arquitetura preparada com base em evidência.

## Próxima issue recomendada

A próxima issue recomendada é detalhar o fluxo de importação.

Motivo:

- o contrato do pacote já está definido;
- a exportação já está documentada;
- a importação conecta colaboração, revisão e aplicação;
- sem importação, o pacote `.svnflow` ainda não fecha o ciclo da v1.

Título sugerido:

```text
Documentar fluxo de importação de alteração
```
