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

## Planejamento Horizontal e Execução Vertical

O SVNFlow pode documentar o produto de forma horizontal, mas deve executar a V1 de forma vertical por milestone.

Documentar horizontalmente significa registrar visão, requisitos, arquitetura, fluxos, contratos, ADRs e provas técnicas de diferentes partes do produto quando isso ajuda a entender o conjunto.

Executar verticalmente significa priorizar trabalho implementável seguindo a ordem das milestones da V1:

```text
M1 Ambiente -> M2 Workspace -> M3 Preview -> M4 Aplicação SVN -> M5 Commit SVN -> M6 Pacotes -> M7 Estabilização -> M8 Release
```

Na prática:

- documentação geral pode antecipar conceitos de milestones futuras;
- issues executáveis devem priorizar a milestone atual;
- issues de milestone futura podem existir no backlog, mas não devem ser puxadas para execução antes da base necessária;
- documentação técnica deve acompanhar a capacidade que ela apoia;
- governança documental ampla pode ficar sem milestone da V1 quando não representar capacidade de produto.

Essa regra evita que a documentação vire bloqueio para começar e evita que a execução pule dependências importantes.

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

## Criação de Novas Issues

O padrão textual das issues segue o YABook. Este documento define apenas como aplicar esse padrão dentro do SVNFlow.

Antes de criar um novo lote de issues:

1. Identifique a milestone atual da V1.
2. Identifique o épico correspondente.
3. Crie apenas issues suficientes para orientar o próximo bloco de trabalho.
4. Evite criar backlog para o projeto inteiro.
5. Não reclassifique issues antigas apenas para aplicar um padrão novo.

Issues de tarefa da V1 devem ter:

- Project `ya labs development`;
- milestone da fase correspondente;
- vínculo como subissue do épico relacionado;
- uma label de tipo;
- uma ou mais labels de área quando aplicável;
- corpo objetivo seguindo o padrão do YABook;
- critérios de aceite verificáveis;
- fora de escopo explícito quando houver risco de expansão.

Ao preparar um lote novo:

- priorize a milestone atual;
- deixe issues de milestones futuras no backlog apenas quando ajudarem a preservar contexto;
- coloque em `Pronto para dev` somente a próxima issue realmente acionável;
- mantenha as demais em `Backlog`;
- não use Markdown para listar o backlog criado.

Exemplo de aplicação:

```text
Milestone: V1 - M1 Ambiente
Épico: Preparação do Ambiente
Issue: Validar disponibilidade do Git local
Labels: feature, backend
Project: ya labs development
Status inicial: Backlog ou Pronto para dev
```

## Labels

Labels classificam a issue por tipo e área, seguindo o padrão do YABook.

Elas não substituem milestone, épico ou subissue.

Use labels para filtrar e organizar issues no Project.

Labels iniciais do SVNFlow:

| Label | Classe | Uso |
| --- | --- | --- |
| `epic` | Tipo especial | Issues que representam capacidades macro da V1. |
| `feature` | Tipo | Entrega funcional nova ou incremento de comportamento. |
| `bug` | Tipo | Correção de comportamento incorreto. |
| `docs` | Tipo | Documentação estável, guias, contratos, ADRs ou ajustes textuais. |
| `frontend` | Área | Interface, telas, componentes e experiência visual. |
| `backend` | Área | Regras internas, comandos, integração local, leitura de arquivos e execução de operações. |
| `architecture` | Área | Decisões ou desenho estrutural do produto. |
| `prototype` | Área | Provas técnicas, experimentos e validações antes da implementação final. |
| `process` | Área | Fluxo de trabalho, organização de Project, milestones, épicos e governança do repositório. |

Regra prática:

- épicos devem ter a label `epic` e podem ter uma label de área quando ajudar;
- tarefas comuns devem ter exatamente um tipo principal, como `feature`, `bug` ou `docs`;
- tarefas podem ter uma ou mais áreas, como `backend`, `frontend`, `architecture`, `prototype` ou `process`;
- documentação de arquitetura deve usar `docs` + `architecture`;
- documentação de protótipo ou prova técnica deve usar `docs` + `prototype` e, quando fizer sentido, `frontend` ou `backend`;
- implementação de comportamento deve usar `feature` + a área afetada;
- governança documental ou processo deve usar `docs` + `process`, sem milestone da V1 quando não entregar capacidade de produto.

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

## Gatilho para branch de desenvolvimento e release

Nem todo estágio do projeto exige branch de desenvolvimento dedicada.

Enquanto o repositório estiver majoritariamente em documentação, decisões e preparação de base, o fluxo pode seguir com branch por issue e Pull Request direto para a branch principal.

Adote branch `dev` quando houver início real de implementação com risco de integração contínua entre tarefas.

Regra prática: iniciar `dev` quando pelo menos 2 dos 3 sinais abaixo estiverem presentes:

## Ajustes contínuos de processo

Mudanças pequenas e leves de processo, nomenclatura, organização do repositório e fluxo de trabalho podem ser aplicadas diretamente na `main` sem PR de processo separada.

Registre cada ajuste em [docs/processos/ajustes-operacionais.md](ajustes-operacionais.md) com:

- data;
- commit relacionado;
- tipo (ex.: `docs/proc`);
- o que mudou;
- por quê mudou;
- impacto no fluxo (se houver).

Use a issue fixa [#86 - Ajustes contínuos de processo e organização](https://github.com/ya-labs/SVNFlow/issues/86) como ponto de visibilidade no GitHub, mas o registro oficial versionado fica no arquivo acima.

Critério para "ajuste pequeno" (pode ir na main direto):
- Mudança de nomenclatura ou padrão.
- Ajuste de regra leve de fluxo.
- Atualização de guia ou documentação de processo.
- Alteração de organização do repositório.

Critério para "não entra em ajuste" (precisa issue + branch + PR):
- Mudança de comportamento funcional do produto.
- Alteração de contrato técnico.
- Mudança de arquitetura.
- Trabalho que impacta múltiplas etapas.

- já existem issues de implementação ativa (além de documentação);
- há trabalho paralelo em mais de uma issue com potencial de conflito;
- existe necessidade de proteger a branch principal para manter apenas conteúdo pronto para release.

Quando esses sinais não estiverem presentes, manter fluxo simples evita burocracia precoce.

A branch de release deve ser usada apenas quando existir versão candidata consolidada para publicação.

Para a v1 do SVNFlow, a release `1.0.0` deve começar quando a V1 estiver pronta para uso conforme critérios de pronto e validações da etapa de release.

## O que não registrar em Markdown

Não registre em Markdown:

- backlog detalhado;
- status de cards;
- andamento de issue;
- próxima issue operacional;
- lista completa de subtarefas por épico;
- progresso do Project.

Essas informações pertencem ao GitHub.
