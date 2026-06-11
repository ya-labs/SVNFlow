# Problema do SVNFlow

## Objetivo

Este documento registra o problema que o SVNFlow busca resolver: apoiar, por meio de um aplicativo desktop local, o fluxo de preparação e publicação de alterações quando o Git é usado como ambiente de organização do trabalho e o SVN permanece como destino oficial.

O objetivo deste documento é registrar o cenário, os riscos, as necessidades e os limites do produto antes de definir arquitetura, stack ou implementação.

## Contexto

Em muitos ambientes corporativos, o SVN continua sendo utilizado como repositório oficial de projetos. Esse papel pode existir por motivos históricos, operacionais, contratuais, de infraestrutura ou de padronização interna.

Ao mesmo tempo, o Git oferece recursos úteis para o trabalho diário de desenvolvimento, como branches, commits pequenos, histórico local, comparação de alterações, integração gradual e validação antes da publicação.

O SVNFlow nasce para estudar um fluxo visual e assistido entre esses dois mundos:

```text
Git organiza e prepara o trabalho local.
SVN permanece como destino oficial de publicação.
```

O projeto não pretende substituir o SVN, nem criar uma ponte própria sem avaliar ferramentas existentes. A descoberta do `git svn` muda a análise: existe uma ferramenta oficial do ecossistema Git para interoperar com SVN, e ela deve ser tratada como referência técnica importante.

## Problema Central

O problema central não é apenas conectar Git e SVN. Essa conexão já pode ser feita em alguns cenários com `git svn` ou com fluxos manuais baseados em comandos Git e SVN.

O problema que o SVNFlow busca estudar é como tornar esse processo mais claro, visual, seguro e repetível para pessoas desenvolvedoras que precisam preparar alterações localmente e publicá-las em um checkout SVN oficial.

Nesse cenário, um aplicativo desktop local pode ajudar a responder perguntas práticas:

- o ambiente Git está limpo antes de iniciar o fluxo?
- o checkout SVN está limpo antes de receber alterações?
- quais arquivos seriam enviados para o SVN?
- quais arquivos seriam criados, modificados ou removidos?
- a cópia para o SVN foi aplicada corretamente?
- o `svn status` está coerente com a prévia?
- qual mensagem de commit SVN pode representar a alteração?
- o commit no SVN está pronto ou ainda precisa de revisão manual?

O valor do SVNFlow está em guiar o processo, reduzir erro humano e deixar explícito o que será feito antes de qualquer alteração sensível.

## Visão Inicial do Produto

O SVNFlow será estudado como um aplicativo desktop local. A aplicação deve ser baixada e executada na máquina de cada pessoa desenvolvedora, sem depender de servidor externo para operar sobre os arquivos do projeto.

A primeira visão do produto é uma interface visual com botões para executar etapas controladas do fluxo:

- `check`: verificar se Git e SVN estão em estado adequado para iniciar;
- `preview`: mostrar os arquivos que seriam levados para o SVN;
- `export`: gerar um pacote `.svnflow` a partir de uma alteração preparada no Git;
- `import`: importar um pacote `.svnflow` recebido de outra pessoa;
- `apply`: aplicar alterações no checkout SVN;
- `status`: mostrar o estado atual do SVN;
- `commit-message`: sugerir uma mensagem de commit baseada em branch e commits Git;
- `sync`: executar o fluxo completo até antes do commit SVN;
- `commit`: etapa opcional e protegida, permitida apenas após validação explícita.

O commit no SVN deve ser tratado como operação sensível. A aplicação deve priorizar prévia, confirmação e validação antes de publicar qualquer alteração.

## Relação com `git svn`

O `git svn` é uma referência importante para o projeto porque já oferece interoperabilidade entre Git e SVN. Ele pode inspirar o fluxo do SVNFlow e, em uma alternativa futura, pode até ser usado como parte da implementação.

Mesmo assim, a existência do `git svn` não elimina o espaço do SVNFlow. O foco do SVNFlow é diferente:

- oferecer uma experiência visual;
- organizar o fluxo em etapas compreensíveis;
- proteger operações sensíveis com prévias e confirmações;
- facilitar o uso por mais de uma pessoa;
- permitir colaboração por transporte local de alterações;
- documentar decisões e limites de forma clara;
- reduzir dependência de comandos manuais memorizados.

O projeto avaliou essas opções na matriz de alternativas. Para a v1, a decisão inicial é usar comandos `git` + `svn`, manter fluxo manual assistido e adicionar colaboração por pacote `.svnflow`.

## Necessidades Que o Fluxo Precisa Preservar

Um fluxo útil para esse cenário precisa preservar algumas capacidades:

- organizar tarefas em linhas de trabalho separadas no Git;
- revisar alterações antes de enviá-las ao SVN;
- comparar mudanças entre origem Git e destino SVN;
- validar estado limpo antes e depois da aplicação;
- mostrar claramente o que será criado, modificado ou removido;
- evitar publicação acidental no SVN;
- permitir que mais de uma pessoa utilize o mesmo processo;
- permitir que uma pessoa exporte uma alteração e outra importe, revise e integre;
- manter rastreabilidade entre tarefa, alteração e commit SVN;
- funcionar localmente sem enviar código para servidor externo.

Essas necessidades servem como critérios para avaliar alternativas futuras.

## Riscos Que o Projeto Deve Evitar

O SVNFlow deve ser desenhado para evitar riscos comuns em fluxos híbridos:

- armazenar código corporativo no repositório público do projeto;
- enviar código local para servidores externos sem necessidade;
- publicar alterações no SVN sem prévia;
- aplicar alterações em um checkout SVN sujo;
- copiar arquivos para o SVN sem registrar remoções corretamente;
- esconder erros de comandos Git, SVN ou `git svn`;
- criar automações difíceis de revisar;
- assumir que Git e SVN possuem o mesmo modelo de histórico;
- tratar o commit SVN como uma etapa automática comum.

O projeto deve usar linguagem pública, preventiva e impessoal. A documentação não deve registrar casos internos, nomes de empresas, nomes de clientes, URLs privadas, caminhos locais ou trechos reais de código corporativo.

## Problemas Reais do Cenário Git + SVN

A coexistência entre Git e SVN envolve diferenças práticas:

- Git trabalha naturalmente com commits locais e branches leves.
- SVN normalmente centraliza o histórico no repositório oficial.
- Branches em Git e branches em SVN não possuem necessariamente o mesmo custo ou modelo mental.
- O fluxo de revisão no Git costuma acontecer antes da integração; em SVN, muitas equipes trabalham com publicação direta no repositório central.
- Colaboração por Git local sem um repositório compartilhado pode dificultar troca de branches, revisão e integração.
- Sincronização manual entre Git e SVN pode gerar erro humano se não houver processo claro.
- Um fluxo visual precisa deixar explícito o que é ambiente de preparação e o que é destino oficial.

Esses problemas indicam que o SVNFlow precisa estudar processo, segurança, experiência de uso e colaboração, não apenas comandos.

## Restrições

O projeto deve respeitar algumas restrições desde o início:

- o SVN deve continuar sendo tratado como destino oficial no cenário estudado;
- o Git deve ser tratado como ambiente de preparação e organização;
- o SVNFlow deve operar localmente;
- o app não deve depender de servidor externo para acessar código;
- o repositório público do projeto não deve conter código corporativo real;
- a documentação pública deve usar linguagem genérica, impessoal e preventiva;
- decisões técnicas devem ser tomadas somente depois de comparar alternativas;
- o commit no SVN deve exigir validação explícita.

## Fora de Escopo Neste Momento

Nesta etapa, o SVNFlow não pretende:

- escolher stack do app desktop;
- definir arquitetura final;
- implementar botões ou comandos;
- exigir `git svn` na v1;
- substituir políticas internas de empresas;
- armazenar ou referenciar código corporativo real;
- automatizar commit SVN sem confirmação.

A comparação de alternativas será tratada em uma etapa própria.

## Perguntas em Aberto

As perguntas abaixo devem alimentar as próximas etapas:

- O fluxo deve exigir dois diretórios locais, um Git e um SVN?
- Como o app deve mapear arquivos removidos no Git para remoções no SVN?
- Como validar que o checkout SVN está atualizado antes de aplicar alterações?
- Como deve funcionar o histórico local simples de pacotes exportados e importados?
- O botão `sync` deve existir na v1 ou o fluxo deve começar por exportar/importar?
- O commit SVN deve existir na v1 ou ficar fora do primeiro protótipo funcional?
- Como gerar mensagem de commit a partir de branch e commits Git?
- Quais logs locais o app deve manter sem registrar conteúdo sensível?
- Como apresentar diffs de forma útil sem expor dados fora da máquina?

## Próximos Passos

Os próximos passos do projeto são:

- detalhar o fluxo de exportação e importação do pacote `.svnflow`;
- definir a tela de exportação como mini PR local;
- definir o histórico local simples da aplicação;
- validar geração e aplicação de patch em ambiente fictício;
- desenhar o fluxo visual mínimo da v1;
- manter o repositório público livre de informações sensíveis.
