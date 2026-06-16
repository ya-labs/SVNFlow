# Fluxo de Trabalho no GitHub

## Objetivo

Este documento registra como o SVNFlow aplica o fluxo organizacional do YABook durante a construção da V1.

O padrão geral de issues, branches, commits, Pull Requests, releases, uso de IA e documentação fica no YABook. Este arquivo deve conter apenas regras específicas do SVNFlow.

## Fluxo base

Mudanças relevantes seguem o fluxo da YA LABS:

```text
Issue -> Branch -> Commit -> Pull Request -> Merge -> Validação
```

No SVNFlow, toda mudança relevante deve manter rastreabilidade entre:

- issue;
- branch;
- commit;
- Pull Request;
- Project `ya labs development`;
- milestone da V1, quando fizer parte de capacidade de produto;
- épico relacionado, quando houver.

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
| `V1 - M7 Estabilização` | Corrigir bugs, melhorar UX, mensagens e casos de borda. |
| `V1 - M8 Release` | Preparar entrega experimental da V1. |

Testes acontecem dentro de todas as milestones. A milestone `V1 - M7 Estabilização` existe para ajustes finais, bugs, UX, mensagens e casos de borda, não para concentrar todos os testes do projeto.

## Execução da V1

O SVNFlow pode documentar conceitos de forma horizontal, mas deve executar a V1 verticalmente por milestone.

Na prática:

- issues executáveis priorizam a milestone atual;
- issues de milestone futura podem existir no backlog quando preservarem contexto;
- documentação técnica acompanha a capacidade que ela apoia;
- governança documental ampla pode ficar sem milestone da V1 quando não representar capacidade de produto;
- o roteiro geral permanece estático e não deve virar status operacional.

## Épicos da V1

Épicos são issues normais do GitHub com label `epic`.

Eles representam capacidades macro da V1 e ficam na coluna `Épicos` do Project `ya labs development`.

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

## Issues da V1

O corpo, branch e Pull Request seguem o padrão do YABook.

Issues da V1 podem usar seções complementares quando isso ajudar a execução, como `Cabeçalho`, `Entrega Visual Esperada`, `Fora de escopo`, `Validação`, `Referências` e `Dependências`.

Essas seções servem para reduzir ambiguidade em tarefas preparadas para IA, não para criar um template obrigatório maior que o necessário.

Ao criar ou classificar uma issue do SVNFlow:

1. Identifique a milestone atual ou futura.
2. Identifique o épico correspondente, quando a tarefa entregar capacidade da V1.
3. Adicione a issue ao Project `ya labs development`.
4. Vincule como subissue do épico relacionado, quando aplicável.
5. Use label de tipo e área compatíveis.
6. Inclua critérios de aceite verificáveis.
7. Inclua fora de escopo quando houver risco de expansão.

Ao preparar um lote novo:

- priorize a milestone atual;
- deixe issues de milestones futuras no backlog apenas quando ajudarem a preservar contexto;
- coloque em `Pronto para dev` somente a próxima issue realmente acionável;
- mantenha as demais em `Backlog`;
- não use Markdown para listar o backlog criado.

## Entrega visual esperada

Quando uma issue implementar funcionalidade com impacto visível no app, inclua `Entrega Visual Esperada` se isso ajudar a validar a funcionalidade pela interface.

Use essa seção para deixar claro:

- tela, ação, botão, estado ou mensagem esperada;
- como testar pela interface;
- estados mínimos, como sucesso, bloqueio, erro ou vazio;
- limite visual da issue.

Ajustes visuais mínimos pertencem à própria issue da funcionalidade quando são necessários para usar ou validar o fluxo. Refinamentos transversais, polimento amplo, tema, reorganização geral de layout ou padronizações que afetam várias telas devem ficar em issues visuais separadas.

## Labels específicas do SVNFlow

Labels classificam a issue por tipo e área. Elas não substituem milestone, épico ou subissue.

Labels usadas no SVNFlow:

| Label | Classe | Uso |
| --- | --- | --- |
| `epic` | Tipo especial | Issues que representam capacidades macro da V1. |
| `feature` | Tipo | Entrega funcional nova ou incremento de comportamento. |
| `bug` | Tipo | Correção de comportamento incorreto. |
| `docs` | Tipo | Documentação estável, guias, contratos, ADRs ou ajustes textuais. |
| `frontend` | Área | Interface, telas, componentes e experiência visual. |
| `backend` | Área | Regras internas, comandos, integração local, leitura de arquivos e execução de operações. |
| `full-stack` | Área | Entrega que envolve interface e regras internas na mesma issue. |
| `architecture` | Área | Decisões ou desenho estrutural do produto. |
| `prototype` | Área | Provas técnicas, experimentos e validações antes da implementação final. |
| `process` | Área | Fluxo de trabalho, organização de Project, milestones, épicos e governança do repositório. |

Regras locais:

- épicos devem ter label `epic` e podem ter uma label de área quando ajudar;
- tarefas comuns devem ter exatamente um tipo principal, como `feature`, `bug` ou `docs`;
- tarefas que exigem interface e regras internas na mesma issue devem usar `full-stack`, sem acumular `frontend` + `backend`;
- documentação de arquitetura deve usar `docs` + `architecture`;
- documentação de protótipo ou prova técnica deve usar `docs` + `prototype`;
- governança documental ou processo deve usar `docs` + `process`, sem milestone da V1 quando não entregar capacidade de produto.

## Project

O Project `ya labs development` deve separar:

- épicos na coluna `Épicos`;
- tarefas no fluxo normal de execução;
- progresso por milestone no GitHub.

Épicos não devem ser movidos entre `Backlog`, `Pronto para dev`, `Em andamento` e `Concluído` como se fossem tarefas comuns. Eles permanecem em `Épicos` enquanto agrupam e orientam a fase.

## Ajustes operacionais

Mudanças pequenas e leves de processo, nomenclatura, organização do repositório e fluxo de trabalho podem ser aplicadas diretamente na `main` quando autorizadas.

Registre em [ajustes-operacionais.md](ajustes-operacionais.md) apenas ajustes que mudem regra recorrente de processo, governança, nomenclatura ou organização do trabalho.

Use a issue fixa [#86 - Ajustes contínuos de processo e organização](https://github.com/ya-labs/SVNFlow/issues/86) apenas quando o ajuste precisar de visibilidade no GitHub.

Critério para ajuste pequeno:

- mudança de nomenclatura ou padrão;
- ajuste leve de fluxo;
- atualização de guia ou documentação de processo;
- alteração de organização do repositório.

Mudança de comportamento funcional, contrato técnico, arquitetura ou trabalho que impacta múltiplas etapas deve seguir issue, branch e Pull Request.

## Branch de desenvolvimento e release

Enquanto o repositório estiver majoritariamente em documentação, decisões e preparação de base, o fluxo pode seguir com branch por issue e Pull Request direto para a branch principal.

Adote branch `dev` quando houver início real de implementação com risco de integração contínua entre tarefas.

Regra prática: iniciar `dev` quando pelo menos 2 dos 3 sinais abaixo estiverem presentes:

- já existem issues de implementação ativa além de documentação;
- há trabalho paralelo em mais de uma issue com potencial de conflito;
- existe necessidade de proteger a branch principal para manter apenas conteúdo pronto para release.

A branch de release deve ser usada apenas quando existir versão candidata consolidada para publicação.

Para a V1 do SVNFlow, a release `1.0.0` deve começar quando a V1 estiver pronta para uso conforme critérios de pronto e validações da etapa de release.

## O que não registrar em Markdown

Não registre em Markdown:

- backlog detalhado;
- status de cards;
- andamento de issue;
- próxima issue operacional;
- lista completa de subtarefas por épico;
- progresso do Project.

Essas informações pertencem ao GitHub.
