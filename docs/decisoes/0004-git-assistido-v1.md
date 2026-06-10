# Decisão 0004: Git assistido na v1 sem substituir fluxo de GitHub

## Status

Aceita para orientar a v1.

## Contexto

O SVNFlow já define que o SVN continua como destino oficial de publicação e que o Git organiza alterações localmente.

Durante a documentação das provas técnicas, ficou evidente que parte da fricção operacional está no uso de operações Git locais (estado da base, atualização da branch base, bloqueios por estado inseguro e orientação para próxima ação).

Também ficou evidente o risco de aumento de escopo se o SVNFlow tentar reproduzir uma experiência completa de colaboração equivalente ao GitHub.

## Decisão

Na v1, o SVNFlow deve oferecer **Git assistido operacional**, focado em segurança e previsibilidade do fluxo local.

Isso inclui:

- leitura e exibição de estado Git local relevante para o fluxo;
- validações e bloqueios para estados inseguros;
- orientação para atualização assistida da branch base local;
- mensagens objetivas sobre erro, bloqueio e próximos passos;
- preservação de branches de trabalho sem automação destrutiva.

O SVNFlow **não** deve tentar substituir o fluxo de colaboração do GitHub na v1.

## Fora da v1

Ficam fora do recorte imediato:

- revisão completa de Pull Request;
- interface completa para merge/rebase;
- resolução automática ou assistida avançada de conflitos;
- automações que descartem trabalho local sem confirmação forte.

## Consequências

Essa decisão mantém o escopo controlado e útil desde o início.

O produto ganha apoio operacional em pontos de maior risco sem abrir uma frente paralela de produto para colaboração completa de Git.

A documentação funcional deve tratar Git assistido como camada de suporte ao fluxo principal do SVNFlow, e não como objetivo principal do produto.