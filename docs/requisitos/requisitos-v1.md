# Requisitos da V1

## Objetivo

Este documento separa requisitos do produto de fluxos de uso.

Requisitos dizem o que o sistema deve fazer. Fluxos descrevem a sequência esperada de uso.

## Requisitos funcionais

| Código | Requisito |
| --- | --- |
| RF-001 | O sistema deve detectar um repositório Git local. |
| RF-002 | O sistema deve detectar um checkout SVN local. |
| RF-003 | O sistema deve validar estados mínimos de Git e SVN antes de operações sensíveis. |
| RF-004 | O sistema deve detectar ou permitir selecionar a branch Git de origem. |
| RF-005 | O sistema deve permitir definir uma base de comparação. |
| RF-006 | O sistema deve gerar preview dos arquivos afetados. |
| RF-007 | O sistema deve gerar `patch.diff` a partir da alteração Git. |
| RF-008 | O sistema deve exportar pacote `.svnflow`. |
| RF-009 | O sistema deve importar e validar pacote `.svnflow`. |
| RF-010 | O sistema deve renderizar o `pr.md` interno do pacote. |
| RF-011 | O sistema deve aplicar alteração no checkout SVN somente após validação e confirmação. |
| RF-012 | O sistema deve exibir `svn status` após aplicação. |
| RF-013 | O sistema deve tratar commit SVN como operação protegida. |
| RF-014 | O sistema deve registrar histórico local simples de pacotes. |
| RF-015 | O sistema deve conduzir a jornada solo como fluxo padrão da V1. |
| RF-016 | O sistema deve deixar claro quando uma operação altera arquivos locais e quando publica no SVN. |
| RF-017 | O sistema deve permitir salvar e selecionar ambientes locais com workspace Git e checkout SVN. |

## Requisitos não funcionais

- Operar localmente.
- Evitar envio de código para servidores externos.
- Usar mensagens claras para falhas de Git, SVN, pacote e patch.
- Bloquear operações sensíveis em estado inseguro.
- Manter exemplos e documentação sem conteúdo corporativo real.
- Seguir o Design System oficial da YA LABS como base visual do protótipo e da aplicação.

## Escopo do Trabalho Solo

O trabalho solo faz parte do escopo principal da V1.

Critérios mínimos:

- a jornada solo deve ser clara do início ao fim;
- validações e bloqueios devem ser suficientes para uso individual seguro;
- o fluxo deve fechar com preview, aplicação no checkout SVN, `svn status`, commit protegido e histórico local.

## Fora da V1

- Plataforma colaborativa completa.
- Pull Request completo dentro do app.
- Merge, rebase ou resolução automática avançada.
- Dependência obrigatória de `git svn`.
- Navegação remota em servidores SVN.
- Gerenciamento de credenciais SVN.
