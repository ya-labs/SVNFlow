# SVNFlow

SVNFlow é um estudo de produto para um aplicativo desktop local que apoia fluxos de trabalho em que o Git é usado para organizar e preparar alterações, enquanto o SVN permanece como destino oficial de publicação.

O projeto busca tornar esse processo mais visual, seguro e repetível, com foco em prévia, validação e confirmação antes de qualquer alteração sensível no checkout SVN.

## Visão geral

O SVNFlow não pretende substituir o SVN, substituir o Git ou competir diretamente com `git svn`.

A proposta inicial é estudar uma camada visual e guiada para operações como:

- verificar se ambientes Git e SVN estão limpos;
- pré-visualizar arquivos que seriam levados ao SVN;
- aplicar alterações em um checkout SVN de forma controlada;
- consultar `svn status`;
- atualizar a base local a partir do SVN;
- sugerir mensagem de commit;
- executar um fluxo assistido até antes do commit SVN;
- proteger o commit SVN com validação explícita.

## Estado do projeto

Este repositório está em fase inicial de documentação e descoberta, com uma decisão inicial de escopo para a v1.

A v1 do SVNFlow deve priorizar um fluxo rápido e local combinando:

- comandos `git` + `svn` para validação e aplicação controlada;
- fluxo manual assistido para reduzir automação prematura;
- colaboração por pacote `.svnflow` para transportar uma alteração revisável entre pessoas.
- tela de exportação no modelo de mini PR local, com branch de origem detectada automaticamente e campos estruturados;
- geração de um `pr.md` padronizado dentro do pacote `.svnflow`;
- transporte técnico da alteração por `patch.diff`;
- histórico local simples para pacotes exportados e importados;
- botão **Atualizar Base pelo SVN** para receber alterações já publicadas no repositório oficial.

Ainda não há decisão final sobre stack, arquitetura, comandos internos, empacotamento desktop ou uso direto de `git svn`.

## Segurança e privacidade

Este é um repositório público da YA LABS.

Por isso, a documentação e qualquer implementação futura devem respeitar estas regras:

- não armazenar código corporativo real;
- não registrar nomes de empresas, clientes ou projetos internos;
- não publicar URLs privadas, caminhos locais ou credenciais;
- não incluir trechos reais de código sensível;
- manter exemplos genéricos e seguros.

O SVNFlow deve operar localmente e não deve enviar código para servidores externos sem uma decisão explícita e documentada.

## Documentação

A documentação do projeto fica em:

```text
docs/
```

Leitura inicial recomendada:

- [Documentação do projeto](docs/README.md)
- [Mapa do problema](docs/planejamento-inicial/mapa-do-problema.md)
- [Decisão de escopo da v1](docs/decisoes/0001-escopo-v1.md)
- [Contrato inicial do pacote `.svnflow`](docs/decisoes/0002-contrato-inicial-pacote-svnflow.md)
- [Mapa de etapas da v1](docs/planejamento-v1/mapa-de-etapas-v1.md)
- [Próximo bloco de etapas da v1](docs/planejamento-v1/proximo-bloco-etapas-v1.md)
- [Pacote `.svnflow`](docs/fluxos/pacote-svnflow.md)
- [Exportação de alteração](docs/fluxos/exportacao-alteracao.md)
- [Atualização da base local a partir do SVN](docs/fluxos/atualizacao-base-local-svn.md)

## Fluxo de trabalho

Este projeto segue os padrões da YA LABS documentados no Handbook.

Mudanças relevantes devem seguir o fluxo:

```text
Issue -> Branch -> Commit -> Pull Request -> Merge -> Validação
```

Para documentação, use commits no formato:

```text
docs: descrição curta
```

## Próximas etapas

As próximas etapas da v1 estão organizadas no [Mapa de etapas da v1](docs/planejamento-v1/mapa-de-etapas-v1.md).
