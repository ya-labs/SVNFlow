# SVNFlow

SVNFlow é um estudo de produto para um aplicativo desktop local que apoia fluxos em que Git organiza alterações de desenvolvimento e SVN permanece como destino oficial de publicação.

O projeto busca tornar esse processo mais visual, seguro e repetível, com foco em prévia, validação e confirmação antes de qualquer operação sensível no checkout SVN.

## Documentação

A documentação estável fica em [docs/](docs/README.md).

Leitura recomendada:

- [Visão do produto](docs/produto/visao.md)
- [Problema](docs/produto/problema.md)
- [Público-alvo](docs/produto/publico-alvo.md)
- [Definição da V1](docs/produto/definicao-v1.md)
- [Arquitetura geral](docs/arquitetura/arquitetura-geral.md)
- [Requisitos da V1](docs/requisitos/requisitos-v1.md)
- [Fluxo principal da V1](docs/fluxos/fluxo-principal.md)
- [Fluxo de trabalho no GitHub](docs/processos/fluxo-de-trabalho-github.md)
- [Roteiro geral de etapas](docs/planejamento/roteiro-geral-de-etapas.md)
- [ADRs](docs/adrs/)

## Segurança e privacidade

Este é um repositório público da YA LABS.

Não registre código corporativo real, nomes de empresas, clientes, projetos internos, URLs privadas, caminhos locais reais, credenciais ou trechos sensíveis.

O SVNFlow deve operar localmente e não deve enviar código para servidores externos sem decisão explícita e documentada.

## Fluxo de trabalho

O SVNFlow segue o padrão organizacional do YABook para issues, branches, commits e Pull Requests.

Milestones, épicos, labels e exceções específicas da V1 ficam em [Fluxo de trabalho no GitHub](docs/processos/fluxo-de-trabalho-github.md).

Para documentação, use commits no formato:

```text
docs: descrição curta
```
