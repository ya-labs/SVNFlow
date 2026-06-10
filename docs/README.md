# Documentação do SVNFlow

Este diretório reúne a documentação específica do SVNFlow.

O objetivo é registrar o entendimento do problema, alternativas, decisões e evolução do produto sem expor informações sensíveis.

## Leitura inicial

- [Mapa do problema](planejamento-inicial/mapa-do-problema.md)
- [Matriz de alternativas](planejamento-inicial/matriz-de-alternativas.md)
- [Guia de consulta da documentação](guia-da-documentacao.md)
- [Guia de documentação para IA](guia-de-documentacao-para-ia.md)
- [Roteiro geral de etapas](planejamento/roteiro-geral-de-etapas.md)
- [Decisão de escopo da v1](decisoes/0001-escopo-v1.md)
- [Contrato inicial do pacote `.svnflow`](decisoes/0002-contrato-inicial-pacote-svnflow.md)
- [Commit SVN protegido](decisoes/0003-commit-svn-protegido.md)
- [Mapa 01 - Visão Funcional da v1](planejamento-v1/visao-funcional-v1.md)
- [Mapa 02 - Contratos e Validações da v1](planejamento-v1/contratos-validacoes-v1.md)
- [Mapa 03 - Provas Técnicas da v1](planejamento-v1/provas-tecnicas-v1.md)
- [Plano do protótipo técnico da v1](prototipo/plano-prototipo-v1.md)
- [Prova técnica: Geração de Patch](prototipo/prova-tecnica-geracao-patch.md)
- [Contratos operacionais dos comandos](contratos/operacoes-v1.md)
- [Aplicação do patch no checkout SVN](fluxos/aplicacao-patch-svn.md)
- [Atualização da base local a partir do SVN](fluxos/atualizacao-base-local-svn.md)
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
|-- contratos/
|   `-- operacoes-v1.md
|-- guia-de-documentacao-para-ia.md
|-- guia-da-documentacao.md
|-- fluxos/
|   |-- aplicacao-patch-svn.md
|   |-- atualizacao-base-local-svn.md
|   |-- exportacao-alteracao.md
|   |-- historico-local-pacotes.md
|   |-- importacao-alteracao.md
|   `-- pacote-svnflow.md
|-- planejamento-inicial/
|   |-- mapa-do-problema.md
|   `-- matriz-de-alternativas.md
|-- planejamento/
|   `-- roteiro-geral-de-etapas.md
|-- planejamento-v1/
|   |-- contratos-validacoes-v1.md
|   |-- provas-tecnicas-v1.md
|   `-- visao-funcional-v1.md
`-- prototipo/
    |-- plano-prototipo-v1.md
    `-- prova-tecnica-geracao-patch.md
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
- vínculo de issues ao Project `ya labs development`;
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
