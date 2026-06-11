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

## Requisitos não funcionais

- Operar localmente.
- Evitar envio de código para servidores externos.
- Usar mensagens claras para falhas de Git, SVN, pacote e patch.
- Bloquear operações sensíveis em estado inseguro.
- Manter exemplos e documentação sem conteúdo corporativo real.

## Fora da V1

- Plataforma colaborativa completa.
- Pull Request completo dentro do app.
- Merge, rebase ou resolução automática avançada.
- Dependência obrigatória de `git svn`.

