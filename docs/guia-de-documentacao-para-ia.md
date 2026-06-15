# Guia de Documentação Para IA

## Objetivo

Este documento orienta assistentes de IA a consultar, manter e atualizar a documentação específica do SVNFlow.

Ele representa o estado atual da documentação, não o andamento operacional do projeto. Backlog, progresso, épicos, milestones e execução devem ficar no GitHub.

Regras organizacionais de uso de IA, economia de contexto, issues preparadas e fluxo geral ficam no YABook. Este arquivo existe apenas para localizar fontes específicas do SVNFlow.

## Fluxo de consulta

1. Leia o `AGENTS.md`.
2. Leia este guia.
3. Identifique o tipo da tarefa.
4. Consulte a matriz documental.
5. Use `rg` com palavras-chave direcionadas.
6. Abra documentos completos somente quando o trecho localizado não for suficiente.

Não leia todos os documentos por padrão.

## Matriz documental

| Área | Função | Quando consultar | Quando atualizar | Palavras-chave |
| --- | --- | --- | --- | --- |
| `README.md` | Entrada pública do projeto. | Visão geral e links principais. | Mudança de posicionamento ou leitura inicial. | `SVNFlow`, `documentação` |
| `docs/produto/` | Conhecimento de produto. | Visão, problema, público, definição da V1 e alternativas. | Mudança de escopo, público ou definição. | `V1`, `problema`, `alternativas`, `público` |
| `docs/arquitetura/` | Arquitetura conceitual. | Módulos, responsabilidades e comunicação. | Mudança de desenho conceitual. | `módulo`, `responsabilidade`, `pacote` |
| `docs/requisitos/` | O que o sistema deve fazer. | Requisitos funcionais e não funcionais. | Mudança de capacidade esperada. | `RF-`, `requisito`, `validar` |
| `docs/fluxos/` | Sequências de uso. | Jornada da pessoa usuária. | Mudança na ordem ou comportamento de uso. | `fluxo`, `preview`, `aplicar`, `commit` |
| `docs/interface/` | Diretrizes de interface visual. | Saber se uma entrega é contrato de UI, interface renderizada ou integração visual. | Mudança em critérios de entrega frontend, navegação visual ou diretriz de renderização. | `interface`, `renderizada`, `frontend`, `shell`, `tela` |
| `docs/contratos/` | Formatos e operações. | Pacote, patch, `pr.md`, comandos, entradas, saídas, ambientes salvos e histórico local. | Mudança de formato, bloqueio, falha, validação ou modelo local. | `.svnflow`, `patch.diff`, `pr.md`, `manifest`, `ambiente`, `histórico` |
| `docs/processos/` | Aplicação local do processo de trabalho. | Project, milestones, épicos, subissues, ajustes operacionais e exceções específicas do SVNFlow. | Mudança de fluxo operacional do repositório. | `Project`, `milestone`, `epic`, `subissue`, `Pull Request`, `ajuste` |
| `docs/adrs/` | Decisões aceitas. | Confirmar decisão já tomada. | Nova decisão aceita ou substituição de decisão. | `ADR`, `decisão`, `consequências` |
| `docs/rfcs/` | Propostas abertas. | Ideias ainda não decididas. | Nova proposta em discussão. | `RFC`, `proposta`, `discussão` |
| `docs/prototipos/` | Provas e experimentos. | Evidência técnica ou validação experimental. | Nova prova, resultado ou limite observado. | `prova técnica`, `ambiente fictício`, `validação` |
| `docs/release/` | Critérios de pronto e entrega experimental. | Critérios de aceite final, riscos aceitos e limites de release. | Mudança nos critérios de pronto ou no recorte de entrega experimental. | `pronto`, `release`, `entrega experimental`, `riscos aceitos` |
| `docs/uso/` | Manuais de uso. | Quando precisar entender como a pessoa usuária deve operar o SVNFlow. | Mudança nas trilhas de uso, modo solo ou colaboração por pacote. | `manual`, `uso`, `solo`, `colaboração`, `.svnflow` |
| `docs/planejamento/` | Roteiro macro estático. | Etapas macro da V1. | Apenas quando etapa macro mudar. | `Ambiente`, `Workspace`, `Release` |

## Manual de atualização

- Ao criar documento novo, atualize este guia e o guia humano quando o documento for relevante para navegação.
- Ao mover ou renomear documento, atualize links em `README.md`, `docs/README.md`, `docs/guia-da-documentacao.md`, neste guia e documentos relacionados.
- Ao alterar produto, revise requisitos, arquitetura e ADRs relacionadas.
- Ao alterar fluxo, revise requisitos e contratos relacionados.
- Ao alterar manual de uso, revise fluxos, requisitos e definição da V1 relacionados.
- Ao alterar contrato, revise arquitetura, fluxo e protótipos relacionados.
- Ao alterar a aplicação local do fluxo de trabalho no GitHub, revise `AGENTS.md`, `README.md`, `docs/README.md` e o guia humano apenas se a regra afetar navegação ou execução recorrente.
- Ao aceitar uma decisão, registre como ADR.
- Ao discutir ideia ainda não aceita, use RFC.
- Ao alterar etapa macro da V1, revise o roteiro geral.
- Não use Markdown para registrar backlog, progresso, subtarefas ou andamento de Project.

## Premissas de manutenção

- Markdown guarda conhecimento estável.
- GitHub guarda trabalho executável.
- O roteiro geral deve ser estático e não pode virar roadmap operacional.
- Fluxos descrevem sequência de uso, não requisitos.
- Requisitos descrevem capacidades, não passo a passo.
- ADRs registram decisões aceitas.
- RFCs registram propostas ainda abertas.
- Protótipos e provas técnicas são experimentais e não devem parecer documentação final de produto.

## Postura crítica da IA

A IA não deve concordar automaticamente com sugestões do usuário.

Antes de aceitar uma sugestão:

1. Compare com este guia.
2. Verifique se existe ADR, requisito, contrato ou fluxo relacionado.
3. Avalie risco de duplicação, ruído documental, overengineering ou perda de rastreabilidade.
4. Concorde apenas quando a sugestão for coerente com o projeto.
5. Quando discordar, explique de forma curta e proponha alternativa.

Discordar com critério faz parte do papel da IA neste projeto.

## Buscas úteis

| Tema | Busca sugerida |
| --- | --- |
| Pacote | `rg -n "\\.svnflow|manifest|pr.md|patch.diff" docs` |
| Patch | `rg -n "patch.diff|aplicar patch|checkout SVN" docs` |
| Git | `rg -n "Git|branch|base de comparação|workspace" docs` |
| SVN | `rg -n "SVN|svn status|svn update|commit SVN" docs` |
| Decisões | `rg -n "ADR|decisão|consequências" docs/adrs` |
| Requisitos | `rg -n "RF-|requisito|deve" docs/requisitos` |
| Processo GitHub | `rg -n "Project|milestone|epic|subissue|Pull Request|branch|ajuste" docs/processos AGENTS.md README.md` |
| Histórico local | `rg -n "histórico local|evento_aplicacao|gerado|importado|aplicado|falhou" docs/contratos docs/prototipos` |
| Interface visual | `rg -n "interface|renderizada|frontend|shell|tela|navegação" docs/interface docs/prototipos docs/requisitos` |
