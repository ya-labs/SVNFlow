# Definição da V1

## Objetivo

Este documento define o que precisa existir para o SVNFlow ser considerado V1.

A V1 deve entregar um fluxo local, útil e seguro para preparar alterações com Git, revisar o impacto e aplicar no SVN com confirmação.

O modo de uso principal da V1 é o trabalho solo. A colaboração por pacote `.svnflow` deve existir como camada adicional, sem transformar o produto em plataforma colaborativa completa.

## A V1 será considerada pronta quando permitir

- Detectar um repositório Git local.
- Detectar um checkout SVN local.
- Salvar e selecionar ambientes locais com workspace Git e checkout SVN.
- Validar estados mínimos de Git e SVN antes de operações sensíveis.
- Selecionar ou detectar a branch Git de origem.
- Definir uma base de comparação para gerar alterações.
- Gerar preview dos arquivos afetados.
- Gerar `patch.diff` a partir da alteração Git.
- Exportar pacote `.svnflow`.
- Importar pacote `.svnflow`.
- Renderizar o `pr.md` interno do pacote.
- Aplicar alteração no checkout SVN após validação e aceite explícito.
- Exibir `svn status` após aplicação.
- Tratar commit SVN como operação protegida.
- Registrar histórico local simples de pacotes exportados e importados.
- Conduzir a jornada solo com clareza suficiente para preparar, revisar, aplicar e publicar alterações com segurança.

## Fora da V1

- Substituir o GitHub.
- Implementar revisão completa de Pull Request.
- Automatizar merge, rebase ou resolução avançada de conflitos.
- Usar `git svn` como dependência obrigatória.
- Enviar código para servidor externo.
- Navegar servidores SVN remotos ou criar checkout SVN a partir de URL.
- Gerenciar credenciais de SVN.
- Resolver todos os casos avançados de binários, renomeações e conflitos.

## Marcos conceituais

Os marcos da V1 devem ser acompanhados no GitHub, não em Markdown:

- `V1 - M1 Ambiente`
- `V1 - M2 Workspace`
- `V1 - M3 Preview`
- `V1 - M4 Aplicação SVN`
- `V1 - M5 Commit SVN`
- `V1 - M6 Pacotes`
- `V1 - M7 Estabilização`
- `V1 - M8 Release`
