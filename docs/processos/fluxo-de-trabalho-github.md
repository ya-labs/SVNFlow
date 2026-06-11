# Fluxo de Trabalho no GitHub

## Objetivo

Este documento define como o SVNFlow usa GitHub Issues, Project, milestones, épicos e Pull Requests durante a construção da V1.

Markdown deve guardar conhecimento estável. Trabalho executável, progresso, backlog, épicos e milestones devem ser acompanhados no GitHub.

## Fluxo base

Mudanças relevantes devem seguir o fluxo:

```text
Issue -> Branch -> Commit -> Pull Request -> Merge -> Validação
```

Toda mudança deve manter rastreabilidade entre:

- issue;
- branch;
- commit;
- Pull Request;
- Project `ya labs development`;
- milestone, quando fizer parte da V1.

## Milestones da V1

Milestones representam fases de entrega da V1. Elas medem progresso macro e agrupam épicos e tarefas relacionadas.

As milestones oficiais da V1 são:

| Milestone | Objetivo |
| --- | --- |
| `V1 - M1 Ambiente` | Preparar e validar ambiente local com Git e SVN. |
| `V1 - M2 Workspace` | Ler e validar workspace Git. |
| `V1 - M3 Preview` | Exibir prévia revisável das alterações. |
| `V1 - M4 Aplicação SVN` | Aplicar alterações no checkout SVN sem publicar. |
| `V1 - M5 Commit SVN` | Proteger e confirmar publicação no SVN. |
| `V1 - M6 Pacotes` | Exportar, importar e validar pacotes `.svnflow`. |
| `V1 - M7 Estabilização` | Corrigir bugs, melhorar UX, mensagens e edge cases. |
| `V1 - M8 Release` | Preparar entrega experimental da V1. |

Testes acontecem dentro de todas as milestones. A milestone `V1 - M7 Estabilização` existe para ajustes finais, bugs, UX, mensagens e casos de borda, não para concentrar todos os testes do projeto.

## Épicos

Épicos são issues normais do GitHub com label `epic`.

Eles representam capacidades macro da V1, não tarefas implementáveis pequenas. Por isso, os épicos ficam na coluna `Épicos` do Project `ya labs development` e não devem ser movidos como cards normais de execução.

Os épicos oficiais da V1 são:

| Épico | Milestone |
| --- | --- |
| `Preparação do Ambiente` | `V1 - M1 Ambiente` |
| `Workspace Git` | `V1 - M2 Workspace` |
| `Preview de Alterações` | `V1 - M3 Preview` |
| `Aplicação SVN` | `V1 - M4 Aplicação SVN` |
| `Commit SVN` | `V1 - M5 Commit SVN` |
| `Pacotes SVNFlow` | `V1 - M6 Pacotes` |
| `Estabilização` | `V1 - M7 Estabilização` |
| `Release` | `V1 - M8 Release` |

O título do épico não deve usar prefixo como `Épico:`. A identificação deve vir da label `epic`, da coluna `Épicos`, da milestone e do relacionamento de subissues.

## Modelo de épico

O corpo de um épico deve ser curto e conter:

```md
## Objetivo

Descrever a capacidade macro desta fase da V1.

## Resultado esperado

Descrever o que precisa estar possível ao final do épico.

## Fora de escopo

Listar o que pertence a outra milestone ou épico.

## Definition of Done

- A funcionalidade principal está implementada.
- Os fluxos previstos funcionam.
- A documentação necessária foi atualizada.
- Não existem bugs bloqueantes conhecidos.

## Issues relacionadas

As issues filhas devem ser vinculadas como subissues conforme a fase começar.
```

Evite checklists gigantes dentro do épico. O acompanhamento executável deve ficar nas subissues.

## Subissues

Issues de tarefa devem ser vinculadas como subissues do épico relacionado.

Use subissues para:

- trabalho implementável;
- documentação necessária para uma capacidade da V1;
- provas técnicas relacionadas a uma fase;
- ajustes ou bugs dentro de uma milestone.

Ao criar ou classificar uma issue de tarefa:

1. Identifique o épico relacionado.
2. Use a mesma milestone do épico, quando a tarefa pertencer a uma fase da V1.
3. Vincule a issue como subissue do épico.
4. Adicione a issue ao Project `ya labs development`.
5. Mova a tarefa pelo fluxo normal do Project.

Issues já concluídas também podem ser vinculadas como subissues quando representarem trabalho real de uma capacidade da V1. Issues de governança, reorganização documental ampla ou manutenção de processo podem ficar fora dos épicos quando não representarem capacidade de produto.

## Project

O Project `ya labs development` deve separar:

- épicos na coluna `Épicos`;
- tarefas no fluxo normal de execução;
- progresso por milestone no GitHub.

Épicos não devem ser movidos entre `Backlog`, `Pronto para dev`, `Em andamento` e `Concluído` como se fossem tarefas comuns. Eles permanecem em `Épicos` enquanto agrupam e orientam a fase.

O progresso do épico deve ser observado pelas subissues e pela milestone correspondente.

## Pull Requests

Pull Requests devem fechar issues de tarefa, não épicos, salvo quando o PR realmente concluir todo o épico.

Use `Closes #NNN` para a issue implementável relacionada ao PR.

O épico deve ser fechado apenas quando:

- suas subissues necessárias estiverem concluídas;
- a Definition of Done estiver atendida;
- não houver bugs bloqueantes conhecidos para aquela capacidade macro.

## O que não registrar em Markdown

Não registre em Markdown:

- backlog detalhado;
- status de cards;
- andamento de issue;
- próxima issue operacional;
- lista completa de subtarefas por épico;
- progresso do Project.

Essas informações pertencem ao GitHub.
