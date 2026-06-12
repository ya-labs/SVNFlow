# Uso Econômico da IA

## Objetivo

Este documento define como usar assistentes de IA no SVNFlow com menor gasto de contexto, sem perder rastreabilidade nem qualidade técnica.

A regra principal é simples: a IA deve ler o mínimo necessário para executar a tarefa com segurança. Quando uma issue já tiver contexto suficiente, ela deve ser a fonte principal da implementação.

## Modos de trabalho

### Modo econômico

Use este modo para desenvolvimento comum, correções pequenas e tarefas bem descritas.

Neste modo:

- a pessoa usuária informa o número da issue ou cola o corpo da issue;
- a issue deve indicar épico, milestone e documentos de referência quando isso for relevante;
- a IA lê a issue e abre apenas os arquivos necessários para implementar;
- a IA evita leitura ampla de documentação, GitHub Project e histórico de PRs;
- branch, commit, Pull Request e merge só são feitos quando forem pedidos explicitamente.

Esse modo economiza contexto porque a interpretação pesada já foi feita durante a criação ou refinamento da issue.

### Modo automático

Use este modo quando a pessoa usuária quiser delegar o fluxo completo.

Neste modo, a IA pode:

- consultar GitHub Issues, Project, milestones, épicos e subissues;
- criar ou atualizar issue;
- criar branch;
- implementar;
- testar;
- abrir Pull Request;
- fazer merge, quando isso for autorizado.

Esse modo é mais confortável, mas consome mais contexto porque exige mais leitura, validação e operações no GitHub.

## Issues preparadas para IA

Issues implementáveis devem ser pequenas e conter contexto suficiente para evitar nova investigação ampla.

Uma issue preparada para IA deve conter:

- contexto curto;
- épico e milestone, quando fizer parte da V1;
- documentos de referência, sem copiar trechos grandes;
- objetivo claro;
- escopo;
- fora de escopo;
- critérios de aceite verificáveis;
- validação esperada, como testes, build ou conferência documental.

Modelo recomendado:

```md
## Contexto

Explique por que esta tarefa existe.

## Referências

- `docs/requisitos/requisitos-v1.md`
- `docs/fluxos/fluxo-principal.md`
- `docs/contratos/operacoes-v1.md`

## Objetivo

Descreva a entrega principal.

## Escopo

- Fazer A.
- Fazer B.

## Fora de escopo

- Não fazer C.
- Não alterar D.

## Critérios de aceite

- Deve acontecer X.
- Deve bloquear Y.
- Deve existir teste para Z.
```

## Quando a IA deve ler documentação ampla

A leitura ampla continua necessária quando:

- a issue estiver ambígua;
- a tarefa alterar documentação estrutural;
- a tarefa alterar requisito, contrato, fluxo, arquitetura, ADR ou processo;
- houver conflito entre código, documentação e issue;
- a mudança puder afetar mais de uma milestone ou épico;
- a pessoa usuária pedir atualização de contexto do projeto.

Fora desses casos, a IA deve preferir leitura direcionada por issue, busca com `rg` e abertura pontual de arquivos.

## Criação de issues

Quando a IA criar issues para uma milestone, ela pode fazer uma leitura mais ampla uma única vez para transformar documentação estável em tarefas pequenas e rastreáveis.

Depois disso, cada implementação deve depender principalmente da issue filha, do épico relacionado e dos documentos explicitamente referenciados.

Isso evita repetir a mesma interpretação em toda tarefa.

## Regra prática

Para desenvolvimento comum, prefira:

1. issue pequena;
2. referências documentais claras;
3. leitura mínima;
4. implementação;
5. validação;
6. resumo final.

Para mudanças de processo, documentação estrutural ou organização do GitHub, use o modo automático quando a rastreabilidade completa for mais importante que a economia de contexto.
