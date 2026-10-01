# ADR-008: SVNFlow como cliente SVN, com Git opcional por projeto

## Status

Aceita. Amplia a [ADR-007](ADR-007-sincronizacao-por-espelhamento.md): a sincronização Git → SVN continua igual, mas passa a ser um recurso de projetos com Git vinculado.

## Contexto

Depois da sincronização, a necessidade do dia a dia se ampliou: várias pessoas trabalham direto no SVN e precisam de um cliente visual para:

- encontrar os projetos do servidor e fazer checkout;
- ver o que mudou no checkout e commitar só parte das alterações;
- consultar o histórico do servidor;
- trazer as alterações de outras pessoas (`svn update`).

Exigir um repositório Git em todo projeto impedia esse uso.

## Decisão

- Um **projeto** é um checkout SVN. O repositório Git é **opcional** e pode ser vinculado ou desvinculado a qualquer momento.
- A tela **Repositórios** lista projetos a partir de URLs base informadas pela pessoa (`svn list`), mostra o histórico remoto e faz checkout. As URLs ficam só em `~/.svnflow/settings.json`.
- A aba **Alterações** mostra o `svn status` do checkout com seleção de arquivos:
  - os arquivos novos vêm desmarcados;
  - os selecionados viram `svn add` ou `svn delete`, conforme o caso;
  - o commit usa `--depth empty` com uma lista explícita de caminhos, para não levar o que não foi marcado.
- A aba **Histórico** lê o `svn log` pela URL do projeto, inclusive revisões que o checkout ainda não tem, com o diff de cada arquivo.
- **Atualizar do servidor** roda `svn update --accept postpone`: conflitos ficam marcados para a pessoa resolver, e nada é resolvido automaticamente.
- Os comandos usam um executor assíncrono, sem shell e com `--non-interactive`.
  - Credenciais pedidas na interface vão por `--password-from-stdin` e ficam só na memória da sessão.
  - Guardar a senha em disco é decisão do cliente SVN da máquina, e não do SVNFlow.

## Consequências

- O SVNFlow serve a quem não usa Git e continua servindo ao fluxo Git → SVN.
- Resolver conflito continua fora do app: ele mostra o conflito e orienta o uso de `svn resolve`.
- `svn:externals`, propriedades e travas (`svn lock`) não têm interface na V1.
- Como o repositório do SVNFlow é público, nenhuma URL ou nome de projeto real entra no código, nos testes ou nos documentos; os exemplos usam `svn://servidor/caminho`.
