# Plano do Protótipo Navegável da V1

## Objetivo

O protótipo navegável da V1 deve validar a experiência principal do SVNFlow em um fluxo local, visual e seguro.

O objetivo é verificar se a pessoa usuária consegue entender o que está acontecendo entre Git e SVN antes de qualquer operação sensível.

Este documento não define stack, framework, arquitetura final, layout definitivo ou empacotamento desktop.

## Público do Protótipo

O protótipo deve ser compreensível para uma pessoa desenvolvedora que usa Git e SVN no trabalho diário, mas que não domina comandos avançados, detalhes internos de patch ou estados complexos de repositório.

A interface deve priorizar:

- linguagem clara;
- sequência guiada;
- prévia antes de alteração;
- bloqueios explícitos;
- confirmação antes de operação sensível;
- mensagens que indiquem o próximo ajuste necessário.

## Diretriz Visual

O protótipo navegável deve usar o Design System oficial da YA LABS, documentado no YABook, como referência visual.

O objetivo é manter consistência com o ecossistema YA LABS sem transformar este plano em especificação visual final.

- YABook: `yalabs-design-system.md`.

O protótipo não precisa definir layout final, componentes definitivos ou tokens visuais próprios.

## Escopo

O protótipo deve representar a navegação entre:

- preparação do ambiente;
- seleção do workspace Git;
- preview de alterações;
- exportação de pacote `.svnflow`;
- importação de pacote `.svnflow`;
- revisão do `pr.md`;
- aplicação do `patch.diff` no checkout SVN;
- consulta de `svn status`;
- atualização pelo SVN;
- histórico local;
- commit SVN protegido.

## Fora de Escopo

Ficam fora do protótipo navegável:

- stack final do app desktop;
- layout visual definitivo;
- empacotamento instalável;
- integração com servidor externo;
- execução real em código corporativo;
- resolução automática de conflitos;
- suporte completo a arquivos binários;
- substituição de GitHub, Git ou SVN;
- commit SVN automático.

## Ambiente Fictício

O protótipo deve usar apenas cenários genéricos.

Exemplos, textos e nomes devem evitar qualquer conteúdo corporativo real.

O cenário mínimo pode representar:

- um repositório Git local fictício;
- uma branch de alteração fictícia;
- um checkout SVN local fictício;
- arquivos simples de texto;
- alteração em arquivo existente;
- criação de arquivo novo;
- remoção de arquivo simples;
- pacote `.svnflow` gerado localmente.

## Jornada Navegável Principal

```text
Início
  -> Preparar ambiente
  -> Selecionar workspace Git
  -> Validar Git e SVN
  -> Selecionar branch de origem
  -> Definir base de comparação
  -> Gerar preview
  -> Exportar pacote .svnflow
  -> Importar pacote .svnflow
  -> Revisar pr.md
  -> Aplicar patch no checkout SVN
  -> Consultar svn status
  -> Revisar commit SVN protegido
  -> Registrar histórico local
```

O protótipo deve permitir voltar para etapas anteriores quando a operação ainda não tiver alterado arquivos.

Depois de uma operação sensível, como aplicar patch ou executar `svn update`, a interface deve mostrar o resultado antes de permitir continuidade.

## Telas ou Áreas Esperadas

### 1. Início

Objetivo:

Apresentar os caminhos principais do SVNFlow.

Ações esperadas:

- iniciar fluxo de exportação;
- iniciar fluxo de importação;
- abrir histórico local;
- acessar validação de ambiente.

Estados esperados:

- ambiente ainda não validado;
- ambiente validado;
- última operação local disponível no histórico.

### 2. Ambiente

Objetivo:

Validar se Git, SVN e caminhos locais estão disponíveis.

Informações exibidas:

- status do Git;
- status do SVN;
- caminho do workspace Git;
- caminho do checkout SVN;
- indicação de bloqueios.

Estados esperados:

- sucesso: Git e SVN disponíveis;
- erro: comando não encontrado;
- bloqueio: caminho informado não existe ou não é repositório válido.

Mensagem de bloqueio sugerida:

```text
Não foi possível continuar porque o checkout SVN informado não é válido.
Selecione uma pasta versionada pelo SVN antes de aplicar alterações.
```

### 3. Workspace Git

Objetivo:

Mostrar a branch de origem, a base de comparação e os arquivos que podem entrar no pacote.

Informações exibidas:

- branch atual;
- base de comparação;
- arquivos criados, modificados e removidos;
- indicação de arquivos fora do escopo da V1;
- alerta para estado Git inseguro.

Estados esperados:

- sucesso: branch e base detectadas;
- erro: base de comparação inexistente;
- bloqueio: repositório em `detached HEAD`;
- bloqueio: nenhuma alteração detectada.

### 4. Preview de Alterações

Objetivo:

Permitir revisão antes de exportar pacote ou aplicar mudança.

Informações exibidas:

- resumo da alteração;
- lista de arquivos afetados;
- tipo de alteração por arquivo;
- riscos detectados;
- campos da mini PR local.

Textos mínimos da mini PR:

- título;
- contexto;
- o que mudou;
- observações.

Confirmação sugerida:

```text
Confirmo que revisei os arquivos afetados e quero gerar um pacote .svnflow.
```

### 5. Exportação de Pacote

Objetivo:

Representar a geração do pacote `.svnflow`.

Resultado de sucesso:

- pacote gerado;
- `manifest.json` criado;
- `pr.md` criado;
- `patch.diff` criado;
- local do pacote exibido;
- evento registrado no histórico local.

Estados esperados:

- sucesso: pacote exportado;
- erro: falha ao gerar patch;
- erro: falha ao gravar pacote;
- bloqueio: campos obrigatórios ausentes.

### 6. Importação de Pacote

Objetivo:

Permitir selecionar um pacote `.svnflow`, validar sua estrutura e revisar conteúdo antes de aplicar.

Informações exibidas:

- validade do pacote;
- versão do formato;
- autor informado no pacote;
- branch de origem;
- base de comparação;
- arquivos afetados;
- conteúdo renderizado do `pr.md`.

Estados esperados:

- sucesso: pacote válido;
- erro: pacote corrompido;
- erro: arquivo obrigatório ausente;
- bloqueio: versão de pacote não suportada.

### 7. Aplicação no Checkout SVN

Objetivo:

Aplicar o `patch.diff` no checkout SVN somente depois de validação e confirmação explícita.

Antes da aplicação, a interface deve mostrar:

- caminho do checkout SVN;
- estado do checkout;
- arquivos que serão alterados;
- aviso de que arquivos locais serão modificados;
- confirmação obrigatória.

Confirmação sugerida:

```text
Confirmo que quero aplicar esta alteração no checkout SVN selecionado.
Entendo que esta ação modificará arquivos locais.
```

Estados esperados:

- sucesso: patch aplicado;
- erro: patch não encaixa no destino;
- bloqueio: checkout SVN sujo;
- bloqueio: checkout SVN com conflito;
- bloqueio: pacote ainda não validado.

### 8. Status SVN

Objetivo:

Mostrar o resultado de `svn status` de forma compreensível.

Informações exibidas:

- arquivos modificados;
- arquivos adicionados;
- arquivos removidos;
- conflitos;
- indicação se o checkout está pronto para revisão ou commit.

O protótipo deve evitar depender apenas dos códigos nativos do SVN. Quando exibir códigos como `M`, `A`, `D` ou `C`, deve acompanhá-los de descrição humana.

### 9. Atualização pelo SVN

Objetivo:

Representar a operação protegida de atualização do checkout SVN pela base oficial.

Antes da atualização, a interface deve mostrar:

- caminho do checkout SVN;
- estado atual do checkout;
- aviso sobre possível recebimento de alterações externas;
- confirmação explícita.

Confirmação sugerida:

```text
Confirmo que quero atualizar este checkout SVN a partir do repositório oficial.
```

Estados esperados:

- sucesso: atualização concluída;
- erro: falha de conexão ou comando SVN;
- bloqueio: checkout com conflito;
- bloqueio: alterações locais incompatíveis.

### 10. Commit SVN Protegido

Objetivo:

Representar a publicação oficial como etapa separada e sensível.

Antes do commit, a interface deve mostrar:

- `svn status`;
- arquivos que serão publicados;
- mensagem de commit sugerida ou preenchida;
- aviso de que o commit envia alterações ao SVN oficial;
- confirmação reforçada.

Confirmação sugerida:

```text
Confirmo que revisei as alterações e quero publicar no SVN.
```

Estados esperados:

- pronto para commit;
- bloqueado por checkout sem alterações;
- bloqueado por conflito;
- bloqueado por mensagem ausente;
- commit concluído;
- commit falhou.

O protótipo pode representar o commit como fluxo assistido sem executar publicação real.

### 11. Histórico Local

Objetivo:

Permitir consultar pacotes exportados, importados e aplicados.

Informações exibidas:

- data local do evento;
- tipo de evento;
- nome do pacote;
- branch de origem;
- base de comparação;
- status da operação;
- link ou ação para abrir o `pr.md` renderizado.

O histórico local não deve parecer auditoria oficial.

## Estados Globais

O protótipo deve cobrir estes estados em mais de uma tela:

| Estado | Significado | Comportamento esperado |
| --- | --- | --- |
| Sucesso | Operação concluída. | Mostrar resultado e próxima ação possível. |
| Erro | Operação falhou. | Mostrar causa compreensível e impedir avanço inseguro. |
| Bloqueio | Pré-condição não atendida. | Explicar o que precisa ser corrigido antes de continuar. |
| Confirmação | Operação altera arquivos ou publica. | Exigir aceite explícito antes de executar. |
| Aviso | Há risco ou limitação. | Informar sem bloquear quando o fluxo ainda for seguro. |

## Critérios de Clareza

O protótipo deve ser considerado claro quando a pessoa usuária conseguir responder:

- qual workspace Git está sendo usado;
- qual checkout SVN será alterado;
- qual branch originou a alteração;
- qual base foi usada para comparação;
- quais arquivos serão afetados;
- se a operação altera arquivos locais;
- se a operação publica no SVN;
- o que fazer quando uma validação bloquear o fluxo.

## Critérios de Sucesso

O protótipo será considerado suficiente quando:

- a jornada principal puder ser percorrida de ponta a ponta;
- os caminhos de exportação e importação estiverem representados;
- a aplicação no checkout SVN exigir confirmação explícita;
- o commit SVN aparecer como etapa separada e protegida;
- `svn update` aparecer como operação sensível;
- estados de sucesso, erro e bloqueio estiverem visíveis;
- textos críticos estiverem compreensíveis;
- o histórico local estiver representado como apoio, não auditoria;
- não houver dependência de stack final ou conteúdo real.

## Relação com Documentos Existentes

Este plano deve respeitar:

- [Visão do Produto](../produto/visao.md);
- [Definição da V1](../produto/definicao-v1.md);
- [Fluxo Principal da V1](../fluxos/fluxo-principal.md);
- [Requisitos da V1](../requisitos/requisitos-v1.md);
- [Contratos Operacionais dos Comandos da v1](../contratos/operacoes-v1.md);
- [Commit SVN protegido](../adrs/ADR-003-commit-svn-protegido.md).

## Saída Esperada

Ao final do protótipo navegável, o projeto deve ter evidência suficiente para decidir:

- se a jornada principal está compreensível;
- quais telas precisam existir na V1;
- quais mensagens precisam ser refinadas;
- quais bloqueios são essenciais;
- quais operações podem ser implementadas primeiro;
- quais pontos ainda precisam de prova técnica antes da implementação final.
