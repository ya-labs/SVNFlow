# SVNFlow

SVNFlow é um estudo de produto para um aplicativo desktop local que apoia fluxos em que Git organiza alterações de desenvolvimento e SVN permanece como destino oficial de publicação.

O projeto busca tornar esse processo mais visual, seguro e repetível, com foco em prévia, validação e confirmação antes de qualquer operação sensível no checkout SVN.

## Como funciona

1. Em **Repositórios**, informe a URL base do servidor SVN, navegue pelos projetos, consulte o histórico e faça checkout. Ou adicione um checkout que você já tem.
2. Em **Alterações**, veja o diff de cada arquivo, marque o que entra no commit, escreva a mensagem e publique no SVN.
3. Em **Histórico**, consulte os commits do servidor e o diff de cada arquivo. Quando houver revisões novas, use **Atualizar do servidor**. Se der conflito, escolha pelo app qual versão fica. Cada revisão pode ser desfeita no checkout ou baixada numa pasta separada (checkout naquela revisão).
4. Opcional: vincule um repositório Git ao projeto para copiar o último commit de uma branch para o checkout antes do commit SVN.

Os checkouts são sugeridos dentro de uma pasta padrão (`~/svn`, ou a que você escolher em **Repositórios**).

Atalhos: **F5** ou **Ctrl+R** verifica alterações, **Ctrl+1** e **Ctrl+2** trocam de aba e **Ctrl+Enter** copia do Git ou publica. Operações demoradas (checkout, update, listagem) podem ser canceladas no aviso de carregamento.

## Como instalar

No Linux, baixe o `.deb` ou o `.AppImage` na página de [Releases](https://github.com/ya-labs/SVNFlow/releases). Veja [Instalar o SVNFlow no Linux](docs/release/instalacao-linux.md).

## Como executar a partir do código

Pré-requisitos: Node.js 20+, Git e cliente `svn` no `PATH`.

```bash
npm ci
npm run app
```

Detalhes, dados locais e limitações conhecidas estão em [Entrega experimental da V1](docs/release/entrega-experimental-v1.md).

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
- [Manual de uso da V1](docs/uso/manual-de-uso-v1.md)
- [Entrega experimental da V1](docs/release/entrega-experimental-v1.md)
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
