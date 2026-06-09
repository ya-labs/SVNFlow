# Decisão 0001: Escopo da v1

## Status

Aceita para orientar a primeira versão funcional.

## Contexto

O SVNFlow nasceu como estudo de produto para apoiar fluxos em que o Git organiza alterações localmente e o SVN permanece como destino oficial de publicação.

A matriz inicial comparou alternativas como comandos `git` + `svn`, uso de `git svn`, fluxo manual assistido, patches, repositório Git autorizado e bare repo.

Para a v1, o objetivo é terminar uma versão útil rapidamente, com escopo pequeno, local e seguro.

## Decisão

A v1 será baseada em:

```text
A + C + colaboração por pacote .svnflow
```

Na prática, isso significa:

- usar comandos `git` e `svn` como base operacional;
- manter o fluxo visual e assistido;
- exigir confirmação antes de aplicar alterações no checkout SVN;
- permitir exportar uma alteração para um arquivo `.svnflow`;
- permitir importar uma alteração recebida por arquivo `.svnflow`;
- tratar a exportação como uma mini PR local, com título, contexto, mudanças e observações em campos estruturados;
- gerar um `pr.md` padronizado dentro do pacote `.svnflow`;
- transportar a alteração técnica por `patch.diff` dentro do pacote;
- registrar a branch de origem da alteração durante a exportação;
- registrar a base de comparação usada para gerar o patch;
- mostrar autor, branch de origem, base de comparação, arquivos alterados e resumo antes da aplicação;
- manter histórico local simples de pacotes exportados e importados;
- aplicar a alteração no checkout SVN de desenvolvimento somente após aceite explícito.

## Fluxo principal

Pessoa A exporta uma alteração:

```text
Exportar Alteração
```

O SVNFlow gera um pacote:

```text
5647-bug001.svnflow
```

Pessoa B importa o pacote:

```text
Importar Alteração
```

O app apresenta uma prévia:

```text
Autor: Marco
Branch de origem: 5647-bug001
Base de comparação: main

Arquivos:
- checkout.controller.js
- desconto.service.js

Título:
Corrige tooltip do checkout

Contexto:
Durante a revisão do checkout, foi identificado que o tooltip não deixava clara a regra de desconto.

O que mudou:
- Ajustado texto do tooltip.
- Mantido comportamento atual do cálculo.

Observações:
- Alteração visual simples.
```

Depois da revisão, a pessoa escolhe:

```text
Aceitar
Aplicar na dev
```

## Fora da v1 rápida

Ficam fora do recorte imediato:

- servidor próprio de colaboração;
- repositório Git compartilhado obrigatório;
- bare repo em rede;
- uso obrigatório de `git svn`;
- commit SVN automático;
- arquitetura final do app desktop;
- banco de dados complexo para histórico;
- auditoria oficial de alterações;
- sincronização completa com histórico SVN.

## Consequências

Essa decisão reduz o escopo e favorece uma entrega rápida.

O produto continua local, visual e seguro. A colaboração passa a existir sem depender de infraestrutura extra, porque a alteração trafega em um arquivo controlado pelo próprio SVNFlow.

O histórico local da aplicação deve ajudar a pessoa usuária a consultar pacotes gerados, importados e aplicados. Ele deve listar pacotes e renderizar o `pr.md` interno quando a pessoa abrir um registro, mas não deve ser tratado como fonte oficial de auditoria na v1.

O risco principal é o pacote `.svnflow` precisar lidar bem com conflitos, arquivos removidos, renomeações, binários, encoding e diferenças de fim de linha. Esses pontos devem ser validados no protótipo antes de tratar o formato como estável.

## Próximos passos

- Desenhar a tela de exportação no modelo de mini PR local.
- Definir o histórico local simples de pacotes exportados e importados.
- Validar geração e aplicação de patch em projeto fictício.
- Definir mensagens de erro e bloqueios quando Git ou SVN estiverem em estado inválido.
