# Documentação do SVNFlow

Este diretório reúne a documentação específica do SVNFlow.

O objetivo é registrar o entendimento do problema, alternativas, decisões e evolução do produto sem expor informações sensíveis.

## Leitura inicial

- [Mapa do problema](planejamento-inicial/mapa-do-problema.md)
- [Matriz de alternativas](planejamento-inicial/matriz-de-alternativas.md)
- [Decisão de escopo da v1](decisoes/0001-escopo-v1.md)
- [Contrato inicial do pacote `.svnflow`](decisoes/0002-contrato-inicial-pacote-svnflow.md)
- [Commit SVN protegido](decisoes/0003-commit-svn-protegido.md)
- [Mapa de etapas da v1](planejamento-v1/mapa-de-etapas-v1.md)
- [Plano do protótipo técnico da v1](prototipo/plano-prototipo-v1.md)
- [Aplicação do patch no checkout SVN](fluxos/aplicacao-patch-svn.md)
- [Pacote `.svnflow`](fluxos/pacote-svnflow.md)
- [Exportação de alteração](fluxos/exportacao-alteracao.md)
- [Histórico local de pacotes](fluxos/historico-local-pacotes.md)
- [Importação de alteração](fluxos/importacao-alteracao.md)

## Estrutura atual

```text
docs/
|-- README.md
|-- decisoes/
|   |-- 0001-escopo-v1.md
|   |-- 0002-contrato-inicial-pacote-svnflow.md
|   `-- 0003-commit-svn-protegido.md
|-- fluxos/
|   |-- aplicacao-patch-svn.md
|   |-- exportacao-alteracao.md
|   |-- historico-local-pacotes.md
|   |-- importacao-alteracao.md
|   `-- pacote-svnflow.md
|-- planejamento-inicial/
|   |-- mapa-do-problema.md
|   `-- matriz-de-alternativas.md
|-- planejamento-v1/
|   `-- mapa-de-etapas-v1.md
`-- prototipo/
    `-- plano-prototipo-v1.md
```

## Estrutura prevista

A estrutura deve crescer conforme as issues forem avançando.

Crie apenas os documentos necessários para o recorte atual do projeto.

## Padrões da YA LABS

Este projeto segue os padrões da YA LABS documentados no Handbook.

Use o Handbook como referência para:

- fluxo de trabalho com GitHub;
- padrão de issues;
- padrão de branches;
- padrão de commits;
- padrão de Pull Requests;
- boas práticas de documentação;
- uso de IA.

## Segurança e privacidade

Esta documentação é pública.

Não inclua:

- código corporativo real;
- nomes de empresas, clientes ou projetos internos;
- URLs privadas;
- caminhos locais de ambientes reais;
- credenciais;
- trechos sensíveis de arquivos.

Use exemplos genéricos e linguagem preventiva.
