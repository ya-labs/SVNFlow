# Matriz de Alternativas do SVNFlow

## Objetivo

Este documento compara alternativas para o SVNFlow apoiar fluxos locais em que Git organiza e prepara alterações, enquanto SVN permanece como destino oficial de publicação.

A matriz não escolhe uma solução final. O objetivo é organizar hipóteses, benefícios, limitações, riscos e pontos que precisam de prova de conceito antes de qualquer implementação.

## Critérios de Comparação

As alternativas são avaliadas pelos seguintes critérios:

- segurança e privacidade;
- colaboração entre pelo menos duas pessoas;
- clareza visual para a pessoa usuária;
- rastreabilidade entre tarefa, alteração e publicação;
- risco de erro humano;
- complexidade operacional;
- compatibilidade com SVN como destino oficial;
- viabilidade para um app desktop local.

## Alternativas Avaliadas

| Alternativa | Resumo | Potencial para v1 |
| --- | --- | --- |
| A. SVNFlow com comandos `git` + `svn` | App coordena diretórios Git e SVN usando comandos nativos. | Alto |
| B. SVNFlow usando `git svn` | App usa `git svn` como camada principal de interoperabilidade. | Médio |
| C. Fluxo manual assistido | App guia a pessoa, mas deixa operações críticas manuais. | Médio |
| D. Patches entre Git e SVN | App gera/aplica patches para transportar alterações. | Médio |
| E. Repositório Git compartilhado autorizado | Git vira camada colaborativa intermediária, com SVN como publicação final. | Médio |
| F. Bare repo local ou em rede | Repositório Git simples compartilhado em pasta/rede autorizada. | Baixo a médio |

## A. SVNFlow com Comandos `git` + `svn`

Nesta alternativa, o SVNFlow trabalha com dois diretórios locais:

- um repositório Git usado para preparar alterações;
- um checkout SVN usado como destino oficial de publicação.

O app executa comandos `git` e `svn` para verificar estado, comparar arquivos, aplicar alterações e mostrar prévias.

### Benefícios

- Usa ferramentas conhecidas e separa claramente origem Git e destino SVN.
- Permite construir uma interface visual com etapas explícitas.
- Facilita parar o fluxo antes do commit SVN.
- Não exige que `git svn` esteja instalado.
- Mantém o SVN como destino oficial.

### Limitações

- Precisa mapear corretamente arquivos criados, modificados e removidos.
- Pode exigir regras para ignorar arquivos locais, builds e configurações.
- Exige validação cuidadosa para evitar aplicar alterações em checkout SVN sujo.
- Não resolve colaboração sozinho; apenas organiza a publicação local.

### Riscos

- Cópia incorreta de arquivos entre Git e SVN.
- Remoções não refletidas corretamente no SVN.
- Divergência se o checkout SVN não estiver atualizado.
- Falsa sensação de segurança se o preview for incompleto.

### Pontos para prova de conceito

- Detectar arquivos alterados no Git e comparar com checkout SVN.
- Aplicar criação, modificação e remoção em uma pasta SVN de teste.
- Mostrar `svn status` antes e depois da aplicação.
- Bloquear `apply` quando Git ou SVN estiverem em estado inválido.

## B. SVNFlow usando `git svn`

Nesta alternativa, o SVNFlow usa `git svn` como referência técnica ou camada principal de interoperabilidade.

O `git svn` já oferece recursos para trabalhar com SVN a partir de Git, como buscar alterações do SVN e publicar commits de volta no SVN.

### Benefícios

- Aproveita uma ferramenta existente do ecossistema Git.
- Reduz necessidade de criar uma ponte própria entre Git e SVN.
- Pode preservar histórico de forma mais integrada em alguns cenários.
- Pode simplificar operações quando o fluxo se encaixa no modelo do `git svn`.

### Limitações

- Requer instalação e validação do `git svn` no ambiente local.
- Pode ter restrições importantes com merges e histórico não linear.
- Pode ser menos intuitivo para pessoas que esperam uma separação clara entre Git de trabalho e checkout SVN.
- O app ainda precisa oferecer camada visual, validações e mensagens claras.

### Riscos

- Tratar `git svn` como solução completa sem validar o fluxo real.
- Dificultar colaboração se cada pessoa usar históricos locais diferentes.
- Publicar commits no SVN com histórico ou ordem inesperada.
- Esconder complexidade técnica atrás de botões simples demais.

### Pontos para prova de conceito

- Instalar e validar `git svn` em ambiente de teste.
- Criar um repositório SVN fictício para simular clone, rebase e publicação.
- Verificar como commits, merges e branches aparecem no fluxo.
- Avaliar se a experiência visual fica mais simples ou mais confusa.

## C. Fluxo Manual Assistido

Nesta alternativa, o SVNFlow funciona como checklist visual e painel de validação, mas deixa operações críticas para execução manual pela pessoa usuária.

### Benefícios

- Reduz risco de automação prematura.
- Ajuda a documentar e padronizar o processo antes de automatizar.
- Permite validar a experiência visual rapidamente.
- Pode ser uma etapa inicial segura para v1.

### Limitações

- Entrega menos produtividade.
- Ainda depende de conhecimento de comandos.
- Pode manter parte do erro humano que o produto deseja reduzir.

### Riscos

- Virar apenas documentação interativa, sem ganho operacional suficiente.
- Gerar frustração se muitos passos dependerem de ação manual.
- Dificultar mensuração do valor real do app.

### Pontos para prova de conceito

- Criar tela de checklist do fluxo.
- Mostrar comandos sugeridos sem executá-los.
- Medir quais etapas precisam virar botões na próxima versão.

## D. Patches entre Git e SVN

Nesta alternativa, o SVNFlow gera patches a partir do Git e aplica esses patches no checkout SVN.

### Benefícios

- Mantém transporte de alteração explícito e revisável.
- Pode facilitar revisão antes da aplicação.
- Evita copiar diretórios inteiros.
- Pode funcionar sem `git svn`.

### Limitações

- Patches podem falhar quando há renomeações, binários ou conflitos.
- Pode exigir tratamento especial para arquivos removidos.
- Pode ser menos amigável para pessoas sem familiaridade com patches.

### Riscos

- Aplicação parcial de patch sem validação adequada.
- Diferenças de fim de linha ou encoding.
- Falhas silenciosas se o app não interpretar corretamente o resultado.

### Pontos para prova de conceito

- Gerar patch de alterações simples.
- Aplicar patch em checkout SVN de teste.
- Validar comportamento com remoções, renomeações e arquivos binários.

## E. Repositório Git Compartilhado Autorizado

Nesta alternativa, existe um repositório Git compartilhado em ambiente autorizado para colaboração entre pessoas, enquanto SVN continua sendo o destino final de publicação.

### Benefícios

- Melhora colaboração entre mais de uma pessoa.
- Facilita revisão de branches e histórico Git.
- Pode aproximar o fluxo de trabalho de práticas modernas.
- O SVNFlow poderia atuar na etapa de publicação final para SVN.

### Limitações

- Depende de autorização e infraestrutura adequada.
- Não resolve sozinho a publicação para SVN.
- Pode criar duas fontes de verdade se o processo não for bem definido.

### Riscos

- Confusão entre repositório Git colaborativo e SVN oficial.
- Divergência entre o que foi revisado em Git e o que foi publicado no SVN.
- Adoção informal sem regras claras de governança.

### Pontos para prova de conceito

- Definir o papel exato do repositório Git autorizado.
- Validar fluxo de revisão antes da publicação SVN.
- Testar como o SVNFlow identifica a branch ou alteração pronta para publicar.

## F. Bare Repo Local ou em Rede

Nesta alternativa, um repositório Git bare em pasta local ou rede autorizada funciona como ponto simples de sincronização entre pessoas.

### Benefícios

- Simples de criar tecnicamente.
- Pode permitir troca de branches sem plataforma externa.
- Mantém colaboração em ambiente controlado.

### Limitações

- Não oferece interface de Pull Request, revisão rica ou issues.
- Pode exigir disciplina manual alta.
- Pode ser frágil se a pasta/rede não tiver controle adequado.

### Riscos

- Perda de rastreabilidade.
- Permissões mal configuradas.
- Falta de backup ou governança.
- Confusão entre sincronização Git e publicação SVN.

### Pontos para prova de conceito

- Validar se o cenário realmente precisa dessa camada.
- Testar push/pull entre duas máquinas em ambiente controlado.
- Documentar limitações antes de considerar adoção.

## Comparação Geral

| Critério | A. `git` + `svn` | B. `git svn` | C. Manual assistido | D. Patches | E. Git autorizado | F. Bare repo |
| --- | --- | --- | --- | --- | --- | --- |
| Segurança local | Alta | Alta | Alta | Alta | Depende do ambiente | Depende do ambiente |
| Colaboração | Média | Média | Baixa | Média | Alta | Média |
| Clareza visual | Alta | Média | Alta | Média | Média | Baixa |
| Risco de erro humano | Médio | Médio | Alto | Médio | Médio | Alto |
| Complexidade técnica | Média | Média/alta | Baixa | Média | Média/alta | Média |
| Compatibilidade com SVN oficial | Alta | Alta | Alta | Alta | Alta | Alta |
| Viabilidade desktop local | Alta | Média | Alta | Média | Média | Baixa |

## Leitura Inicial da Matriz

A alternativa A parece a melhor candidata para uma primeira prova de conceito do SVNFlow porque combina bem com a ideia de aplicativo desktop local, visual e controlado.

A alternativa B precisa ser investigada com cuidado porque `git svn` já resolve parte da interoperabilidade, mas pode trazer complexidades próprias de histórico, merges e instalação.

A alternativa C pode ser útil como protótipo de experiência, mas não deve ser tratada como objetivo final se não reduzir trabalho operacional.

As alternativas D, E e F podem ser complementares, dependendo do nível de colaboração necessário e das restrições do ambiente.

Essa leitura não é uma decisão final. Ela apenas orienta quais hipóteses devem ser testadas primeiro.

## Perguntas para as Próximas Decisões

- A v1 deve exigir dois diretórios locais, um Git e um SVN?
- O SVNFlow deve suportar `git svn` já na primeira prova de conceito?
- O botão `sync` deve parar sempre antes do commit SVN?
- O commit SVN deve existir na v1 ou ficar fora do primeiro protótipo?
- Como o app deve tratar arquivos removidos, renomeados e binários?
- Como a aplicação deve apresentar diferenças sem enviar conteúdo para fora da máquina?
- Qual é o mínimo necessário para duas pessoas usarem o fluxo com segurança?
- Quais logs locais são úteis sem registrar conteúdo sensível?

## Próximos Passos

- Definir a primeira prova de conceito com base na alternativa A.
- Criar uma issue específica para validar o comportamento do `git svn` em ambiente de teste.
- Desenhar o fluxo visual mínimo do SVNFlow.
- Definir quais operações são apenas leitura, quais alteram o checkout SVN e quais exigem confirmação explícita.
