# ADR-009: Remoção do modo avançado

## Status

Aceita. Encerra o fluxo por patch e pacotes `.svnflow` da V1. Substitui a [ADR-002](ADR-002-contrato-pacote-svnflow.md) e a [ADR-006](ADR-006-pacote-svnflow-json-v1.md), e conclui o que a [ADR-007](ADR-007-sincronizacao-por-espelhamento.md) já tinha deixado em segundo plano.

## Contexto

Depois da [ADR-007](ADR-007-sincronizacao-por-espelhamento.md) e da [ADR-008](ADR-008-cliente-svn-com-git-opcional.md), o uso real do SVNFlow passou a ser:

- cliente SVN do dia a dia: Repositórios, Alterações, Histórico e Atualizar;
- cópia do último commit Git para o checkout, quando há Git vinculado.

O modo avançado mantinha as etapas da V1 original: Ambiente, Workspace Git, Preview, Pacotes `.svnflow`, Aplicação SVN, Commit SVN protegido e Histórico local. Ele não era mais usado e custava manutenção: telas próprias, canais IPC, módulos e testes que não cobriam o fluxo principal.

## Decisão

- Remover o modo avançado e tudo o que só existia para ele:
  - geração e aplicação de patch;
  - exportação, importação e biblioteca de pacotes `.svnflow` e o `pr.md`;
  - histórico local de pacotes;
  - telas por etapa e commit SVN avulso.
- O fluxo principal fica como único fluxo do app.
- A configuração local `packagesDirectory` deixa de existir. No lugar dela, entra `checkoutDirectory`, a pasta padrão onde o app sugere os checkouts (`<pasta>/<projeto>`).

## Consequências

- Menos código e menos superfície de manutenção. O que sobra está coberto pelos testes do fluxo principal.
- Pacotes `.svnflow` gerados antes não podem mais ser abertos pelo app.
- Os documentos do fluxo por patch e pacote ficam como registro histórico:
  - [contrato do pacote](../contratos/pacote-svnflow.md);
  - [`patch.diff`](../contratos/patch.md);
  - [`pr.md`](../contratos/pr-md.md);
  - [histórico local](../contratos/historico-local.md);
  - [manual de uso da V1](../uso/manual-de-uso-v1.md).
- Voltar a ter colaboração por pacote exige uma nova decisão.
