# Mapa 01 - Visão Funcional da v1

## Objetivo

Este documento organiza a visão funcional inicial da v1 do SVNFlow.

O mapa registra as decisões, fluxos e limites funcionais já documentados para a v1. Ele não define stack, arquitetura final ou implementação definitiva.

## Resumo

| Campo | Valor |
| --- | --- |
| Mapa | 01 - Visão Funcional da v1 |
| Status geral | `concluído` |
| Próxima issue | concluído; continuidade no Mapa 03 pela issue #28 |
| Objetivo | registrar a visão funcional inicial da v1 |
| Escopo | decisões, fluxos funcionais e protótipo técnico |

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
7. Atualização da base local a partir do SVN
8. Protótipo técnico
```

## Trilha

```text
01 - Visão Funcional da v1
├── Base de decisão da v1                 concluída
├── Fluxo de exportação                   documentada
├── Fluxo de importação                   documentada
├── Aplicação do patch                    documentada
├── Histórico local simples               documentada
├── Commit SVN protegido                  documentada
├── Atualização da base local pelo SVN    documentada
└── Protótipo técnico                     documentada
```

## Rastreabilidade

| Ordem | Etapa | Documento | Status |
| --- | --- | --- | --- |
| 1 | Base de decisão da v1 | `docs/decisoes/0001-escopo-v1.md`, `docs/decisoes/0002-contrato-inicial-pacote-svnflow.md` | `concluída` |
| 2 | Fluxo de exportação | `docs/fluxos/exportacao-alteracao.md` | `documentada` |
| 3 | Fluxo de importação | `docs/fluxos/importacao-alteracao.md` | `documentada` |
| 4 | Aplicação do patch | `docs/fluxos/aplicacao-patch-svn.md` | `documentada` |
| 5 | Histórico local simples | `docs/fluxos/historico-local-pacotes.md` | `documentada` |
| 6 | Commit SVN protegido | `docs/decisoes/0003-commit-svn-protegido.md` | `documentada` |
| 7 | Atualização da base local pelo SVN | `docs/fluxos/atualizacao-base-local-svn.md` | `documentada` |
| 8 | Protótipo técnico | `docs/prototipo/plano-prototipo-v1.md` | `documentada` |

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

Definir como uma pessoa transforma uma alteração preparada em uma branch Git em um pacote `.svnflow` revisável.

Saída esperada:

- tela de exportação no modelo de mini PR local;
- branch de origem detectada automaticamente;
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

Status: `documentada`

Objetivo:

Definir como uma pessoa importa um pacote `.svnflow`, revisa seu conteúdo e decide se aceita a alteração.

Saída esperada:

- tela para selecionar pacote `.svnflow`;
- validação da estrutura do pacote;
- renderização do `pr.md`;
- exibição de autor, branch de origem, base de comparação, arquivos afetados e status do pacote;
- ação explícita para aceitar ou cancelar;
- registro local do pacote importado.

Critério de conclusão:

- fluxo de importação documentado;
- validações antes da aplicação definidas;
- estados de sucesso, cancelamento e falha descritos.

Documento relacionado:

- [Importação de alteração](../fluxos/importacao-alteracao.md)

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

Status: `documentada`

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

Documento relacionado:

- [Histórico local de pacotes](../fluxos/historico-local-pacotes.md)

## 6. Commit SVN protegido

Status: `documentada`

Objetivo:

Decidir se o commit SVN entra no protótipo inicial ou se permanece como etapa manual assistida.

Saída esperada:

- decisão sobre incluir ou não commit SVN na v1;
- confirmação explícita obrigatória antes de commit;
- comportamento esperado após aplicação do patch.

Critério de conclusão:

- decisão registrada em documento próprio;
- risco de publicação acidental tratado explicitamente.

Documento relacionado:

- [Decisão 0003: Commit SVN protegido](../decisoes/0003-commit-svn-protegido.md)

## 7. Atualização da base local a partir do SVN

Status: `documentada`

Objetivo:

Definir como o SVNFlow ajuda a pessoa usuária a receber alterações já publicadas no SVN oficial.

Saída esperada:

- botão **Atualizar Base pelo SVN**;
- validação de checkout SVN configurado;
- alerta para alterações locais não publicadas;
- execução assistida de `svn update`;
- exibição de arquivos recebidos, conflitos e revisão SVN resultante;
- exibição de `svn status` ao final;
- orientação para manter a base Git local alinhada sem merge automático em branches de trabalho.

Critério de conclusão:

- fluxo documentado;
- diferença entre pacote `.svnflow` e `svn update` registrada;
- limites de automação sobre a base Git local definidos;
- validações mínimas descritas.

Documento relacionado:

- [Atualização da base local a partir do SVN](../fluxos/atualizacao-base-local-svn.md)

## 8. Protótipo técnico

Status: `documentada`

Objetivo:

Validar o fluxo principal da v1 em um projeto fictício, sem conteúdo corporativo real.

Saída esperada:

- exportar pacote `.svnflow`;
- importar pacote `.svnflow`;
- renderizar `pr.md`;
- aplicar `patch.diff` em checkout SVN de teste;
- exibir `svn status`;
- atualizar base local a partir do SVN em checkout de teste;
- registrar histórico local simples.

Critério de conclusão:

- fluxo validado em ambiente fictício;
- erros principais identificados;
- limitações da v1 documentadas;
- decisão de stack e arquitetura preparada com base em evidência.

Documento relacionado:

- [Plano do protótipo técnico da v1](../prototipo/plano-prototipo-v1.md)
- [Mapa 02 - Contratos e Validações da v1](contratos-validacoes-v1.md)

## Conclusão do Mapa

Este mapa está concluído como visão funcional inicial da v1.

Motivo:

- os principais fluxos da v1 já estão documentados;
- o contrato do pacote `.svnflow` já está definido;
- os contratos operacionais foram documentados em etapa posterior;
- a continuidade do desenvolvimento documental agora acontece no Mapa 03.

Próxima execução operacional:

```text
#28 Documentar prova técnica de geração do patch
```
