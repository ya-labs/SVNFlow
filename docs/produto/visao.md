# Visão do Produto

## Objetivo

O SVNFlow é um aplicativo desktop local para apoiar fluxos em que Git organiza alterações de desenvolvimento e SVN permanece como destino oficial de publicação.

O produto busca tornar esse processo mais visual, seguro e repetível, com prévia, validação e confirmação antes de qualquer operação sensível no checkout SVN.

## Proposta

O SVNFlow não pretende substituir Git, SVN ou GitHub.

A proposta é oferecer uma camada assistida para:

- validar ambientes Git e SVN;
- selecionar uma alteração preparada em branch Git;
- gerar prévia dos arquivos afetados;
- transportar alterações por pacote `.svnflow`;
- aplicar alterações em checkout SVN de forma controlada;
- exibir `svn status`;
- proteger o commit SVN com confirmação explícita.

## Princípios

- Operar localmente.
- Não enviar código para servidores externos sem decisão explícita.
- Preservar o SVN como fonte oficial de publicação.
- Usar Git como apoio local de organização.
- Priorizar segurança operacional antes de automação.
- Manter exemplos genéricos e sem conteúdo corporativo real.

