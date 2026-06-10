# Guia de Documentação Para IA

## Objetivo

Este documento orienta assistentes de IA a consultar, manter e atualizar a documentação do SVNFlow com economia de contexto.

Ele representa o estado atual da documentação, não o andamento operacional do projeto. Status de execução, responsáveis, discussões e histórico de conclusão devem continuar no GitHub, por meio de issues, Pull Requests e Project.

Use este guia para:

- encontrar rapidamente a fonte certa;
- evitar leitura ampla desnecessária;
- saber quando atualizar cada documento;
- preservar premissas documentais já combinadas.

## Fluxo de Consulta da IA

Antes de fazer leitura ampla, criar documentação ou alterar documento existente:

1. Leia o `AGENTS.md`.
2. Leia este guia.
3. Identifique o tipo da tarefa.
4. Consulte a matriz de documentos.
5. Use `rg` com palavras-chave direcionadas.
6. Abra o documento completo somente quando o trecho localizado não for suficiente.

Não leia todos os documentos por padrão. Comece pela menor fonte capaz de responder à tarefa.

## Matriz de Documentos

| Documento ou área | Função | Quando consultar | Quando atualizar | Palavras-chave úteis |
| --- | --- | --- | --- | --- |
| `README.md` | Apresentar o projeto, visão geral, estado público e links principais. | Quando precisar entender o projeto em alto nível ou atualizar a entrada pública. | Quando mudar visão geral, links principais, escopo público ou leitura recomendada. | `SVNFlow`, `visão geral`, `estado do projeto`, `documentação` |
| `AGENTS.md` | Definir regras para assistentes de IA no repositório. | Antes de qualquer alteração relevante ou dúvida sobre fluxo da IA. | Quando mudar regra de trabalho, fluxo obrigatório, segurança, postura ou governança da IA. | `IA`, `fluxo de trabalho`, `documentação`, `commit sugerido` |
| `docs/README.md` | Índice público da documentação. | Quando precisar listar documentos existentes ou conferir estrutura. | Quando criar, mover, renomear ou remover documento relevante para navegação. | `leitura inicial`, `estrutura atual`, `padrões` |
| `docs/guia-da-documentacao.md` | Guia humano de localização da documentação. | Quando precisar escolher a pasta correta ou orientar uma pessoa leitora. | Quando a estrutura documental mudar ou surgir novo documento relevante para consulta humana. | `pastas`, `onde atualizar`, `leitura rápida` |
| `docs/guia-de-documentacao-para-ia.md` | Guia vivo de consulta e manutenção documental para IA. | Antes de leituras amplas, criação de docs ou alteração documental relevante. | Sempre que documento, premissa, matriz ou fluxo de consulta documental mudar. | `matriz`, `premissas`, `manual de atualização` |
| `docs/planejamento-inicial/` | Registrar problema, contexto e alternativas iniciais. | Quando a tarefa envolver motivo do produto, problema original ou alternativas avaliadas. | Quando descoberta inicial ou alternativa relevante mudar sem virar decisão final. | `problema`, `alternativa`, `contexto`, `risco` |
| `docs/decisoes/` | Registrar decisões aceitas, contexto e consequências. | Quando precisar confirmar escolha já tomada ou evitar reabrir discussão decidida. | Quando uma decisão for aceita, substituída ou tiver consequência importante alterada. | `decisão`, `consequências`, `escopo`, `.svnflow`, `commit SVN` |
| `docs/fluxos/` | Descrever comportamento esperado do produto para cada fluxo de uso. | Quando a tarefa envolver experiência, sequência de ações, validações ou mensagens de fluxo. | Quando comportamento esperado, entrada, saída ou limite de um fluxo mudar. | `exportação`, `importação`, `patch.diff`, `svn update`, `histórico local` |
| `docs/contratos/` | Definir entradas, saídas, confirmações, bloqueios e falhas esperadas das operações. | Quando a tarefa envolver comando, validação, erro, bloqueio ou operação sensível. | Quando contrato operacional, falha esperada, confirmação ou saída de comando mudar. | `entrada`, `saída`, `bloqueio`, `falha`, `confirmação` |
| `docs/planejamento-v1/` | Organizar mapas da v1, etapas, rastreabilidade e provas planejadas. | Quando a tarefa envolver bloco da v1, issue relacionada, prova técnica ou sequência documental. | Quando mudar etapa, premissa, rastreabilidade, documento relacionado ou divisão dos mapas. | `Mapa 01`, `Mapa 02`, `Mapa 03`, `prova técnica`, `issue` |
| `docs/planejamento/roteiro-geral-de-etapas.md` | Planejar blocos gerais até o fim do projeto. | Quando precisar entender a ordem macro do projeto. | Somente quando a ordem macro, bloco geral ou escopo final mudar. | `etapas planejadas`, `roteiro`, `blocos`, `pós-v1` |
| `docs/prototipo/` | Planejar validações, provas técnicas e protótipos antes da implementação real. | Quando a tarefa envolver protótipo técnico, prova técnica, validação prática ou critérios de teste. | Quando mudar plano de protótipo, cenário fictício, prova técnica ou evidência esperada. | `protótipo`, `prova técnica`, `validação`, `ambiente fictício`, `critério` |

## Manual de Atualização

Use estas regras antes de editar documentação:

- Atualize sempre o documento principal da tarefa.
- Atualize o mapa relacionado quando a tarefa mudar status, próxima issue, rastreabilidade ou dependência entre etapas.
- Atualize `docs/README.md` somente quando o documento novo for importante para leitura inicial, quando a estrutura de pastas mudar ou quando houver mudança relevante no índice público.
- Atualize `docs/guia-da-documentacao.md` somente quando criar uma nova categoria, mudar a função de uma pasta, mover documentos relevantes para navegação humana ou quando a localização deixar de ser óbvia.
- Atualize este guia somente quando mudar regra de manutenção, fluxo de consulta, papel de uma pasta/documento ou padrão que a IA deve repetir.
- Se mover, renomear ou remover documento, atualize apenas os links diretamente afetados e os índices necessários para evitar navegação quebrada.
- Se alterar premissa de manutenção, atualize a seção de premissas deste guia.
- Se alterar fluxo de uso, revise contratos e decisões relacionadas.
- Se alterar contrato operacional, revise mapas da v1 e provas técnicas relacionadas.
- Se alterar planejamento da v1, revise o roteiro geral somente quando a ordem macro do projeto mudar.
- Se alterar `README.md`, confira se `docs/README.md` e o guia humano continuam coerentes.
- Se alterar `AGENTS.md`, confira se este guia continua compatível com as regras obrigatórias da IA.

Ao finalizar alterações documentais:

1. Valide links Markdown locais.
2. Execute `git diff --check`.
3. Informe uma sugestão de commit no padrão do projeto.

Não trate atualização de índices como obrigação automática. A regra padrão é fazer a menor alteração documental suficiente para entregar a issue com rastreabilidade e navegação aceitáveis.

## Premissas de Manutenção

### Roteiro geral

O roteiro geral deve ser um planejamento simples de etapas até o fim do projeto.

Ele não deve virar:

- diário de execução;
- painel de status;
- registro de PRs concluídas;
- repetição do GitHub Project;
- histórico completo do que já foi feito.

Atualize o roteiro apenas quando mudar a ordem macro, o bloco geral ou o escopo final do projeto.

### Mapas da v1

Os mapas da v1 podem manter rastreabilidade com issues e documentos relacionados.

Eles não devem substituir:

- issue;
- Pull Request;
- Project;
- discussão operacional do GitHub.

Use mapas para orientar sequência, escopo e dependências entre blocos.

### Fluxos

Fluxos devem descrever comportamento esperado do produto.

Eles não devem escolher stack, arquitetura final ou implementação definitiva antes das decisões apropriadas.

Quando um fluxo mudar, verifique se contratos, decisões e mapas relacionados continuam coerentes.

### Contratos

Contratos devem preservar entradas, saídas, bloqueios, confirmações e falhas esperadas.

Eles devem orientar provas técnicas e implementação futura, sem transformar protótipo em produto pronto.

### Decisões

Decisões devem registrar escolhas aceitas, contexto e consequências.

Não registre hipótese técnica como decisão final. Se ainda for hipótese, mantenha em planejamento, mapa ou prova técnica.

### Guias

O `docs/guia-da-documentacao.md` é voltado para pessoas e localização da documentação.

Este guia é voltado para consulta e manutenção documental pela IA.

Não misture os papéis: o guia humano deve continuar simples; este guia deve orientar localização, consulta e atualização de documentos. Regras de comportamento da IA pertencem ao `AGENTS.md`.

## Palavras-chave Por Tema

Use estas buscas antes de abrir documentos longos:

| Tema | Busca sugerida |
| --- | --- |
| Pacote SVNFlow | `rg -n "\\.svnflow|patch.diff|pr.md|manifest" docs` |
| Exportação | `rg -n "exportação|branch de origem|pr.md|patch.diff" docs` |
| Importação | `rg -n "importação|pacote|validar pacote|aplicar" docs` |
| Aplicação de patch | `rg -n "aplicação do patch|patch.diff|checkout SVN|svn status" docs` |
| Atualização pelo SVN | `rg -n "svn update|Atualizar Base|base local" docs` |
| Commit SVN | `rg -n "commit SVN|protegido|confirmação explícita" docs` |
| Histórico local | `rg -n "histórico local|pacotes exportados|pacotes importados" docs` |
| Provas técnicas | `rg -n "prova técnica|ambiente fictício|critério de conclusão" docs` |
| Roteiro | `rg -n "roteiro|etapas planejadas|ordem macro" docs` |
| Premissas | `rg -n "premissa|não deve|deve ser" docs` |

## Regra Final

Se a tarefa for documental e a IA não souber qual arquivo consultar ou atualizar, ela deve voltar para este guia antes de abrir múltiplos documentos.

Se este guia estiver desatualizado, a correção do guia deve fazer parte da mesma alteração documental.
