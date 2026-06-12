# Documentação do SVNFlow

Este diretório reúne a documentação estável do SVNFlow.

Markdown deve guardar conhecimento do produto. Trabalho, backlog, progresso, épicos e milestones devem ficar no GitHub.

## Leitura inicial

- [Visão do produto](produto/visao.md)
- [Problema](produto/problema.md)
- [Público-alvo](produto/publico-alvo.md)
- [Definição da V1](produto/definicao-v1.md)
- [Arquitetura geral](arquitetura/arquitetura-geral.md)
- [Requisitos da V1](requisitos/requisitos-v1.md)
- [Fluxo principal da V1](fluxos/fluxo-principal.md)
- [Manual de uso da V1](uso/manual-de-uso-v1.md)
- [Guia de consulta da documentação](guia-da-documentacao.md)
- [Guia de documentação para IA](guia-de-documentacao-para-ia.md)
- [Uso econômico da IA](processos/uso-economico-da-ia.md)

## Estrutura atual

```text
docs/
|-- adrs/
|-- arquitetura/
|-- contratos/
|-- fluxos/
|-- interface/
|-- processos/
|-- produto/
|-- prototipos/
|-- release/
|-- requisitos/
|-- rfcs/
|-- uso/
|-- guia-da-documentacao.md
`-- guia-de-documentacao-para-ia.md
```

## Regras gerais

- Use `docs/produto/` para conhecimento de produto.
- Use `docs/requisitos/` para o que o sistema deve fazer.
- Use `docs/fluxos/` para sequências de uso.
- Use `docs/interface/` para diretrizes de interface visual, renderização e critérios de entrega frontend.
- Use `docs/contratos/` para formatos, comandos, entradas, saídas, bloqueios e modelos locais como ambientes salvos.
- Use `docs/processos/` para fluxo de trabalho, Project, milestones e épicos.
- Use `docs/adrs/` para decisões aceitas.
- Use `docs/rfcs/` para propostas ainda abertas.
- Use `docs/prototipos/` para validações e experimentos.
- Use `docs/release/` para critérios de pronto, entrega experimental e limites de release.
- Use `docs/uso/` para manuais de uso e trilhas da pessoa usuária.

## Segurança e privacidade

Esta documentação é pública.

Não inclua código corporativo real, nomes de empresas, clientes, projetos internos, URLs privadas, caminhos locais reais, credenciais ou trechos sensíveis.
