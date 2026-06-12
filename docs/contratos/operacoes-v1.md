# Contratos Operacionais dos Comandos da v1

## Objetivo

Este documento define os contratos operacionais mínimos que o SVNFlow precisa respeitar na v1.

O objetivo é descrever, para cada operação, quais entradas são necessárias, quais saídas devem ser apresentadas, quais confirmações são exigidas e quais falhas devem bloquear o fluxo.

Este documento não define stack, arquitetura, biblioteca, framework ou implementação final. Ele descreve comportamento esperado para orientar provas técnicas e protótipo.

## Princípios

- Operações de leitura devem ser claramente separadas de operações que alteram arquivos.
- Operações sensíveis devem exigir confirmação explícita.
- O app deve mostrar prévia antes de aplicar alteração no checkout SVN.
- Falhas de Git, SVN, pacote ou patch devem bloquear o avanço seguro do fluxo.
- O SVNFlow deve operar localmente e não deve enviar código para servidores externos.
- Mensagens de erro devem ser claras para pessoas que não dominam Git ou SVN em profundidade.
- Exemplos e logs documentados devem ser genéricos e sem conteúdo corporativo real.

## Níveis de Proteção

| Nível | Significado | Exemplos |
| --- | --- | --- |
| Leitura | Não altera arquivos nem histórico. | detectar branch, listar arquivos, `svn status` |
| Escrita local controlada | Cria pacote ou registro local sem alterar checkout SVN. | gerar `.svnflow`, registrar histórico |
| Escrita no checkout SVN | Altera arquivos versionados no checkout SVN. | aplicar patch |
| Operação sensível | Pode afetar histórico oficial ou base de trabalho. | `svn update`, commit SVN |

Operações de escrita no checkout SVN e operações sensíveis devem ser protegidas por validação e confirmação.

## Visão Geral das Operações

| Operação | Tipo | Proteção | Resultado esperado |
| --- | --- | --- | --- |
| Detectar branch Git | Leitura | Sem confirmação | Identificar branch de origem |
| Salvar ambiente local | Escrita local controlada | Confirmação simples | Registrar combinação local de workspace Git e checkout SVN |
| Gerar `patch.diff` | Escrita local controlada | Confirmação simples | Criar patch revisável |
| Validar pacote `.svnflow` | Leitura | Sem confirmação | Confirmar pacote importável |
| Validar checkout SVN | Leitura | Sem confirmação | Confirmar destino adequado |
| Aplicar patch | Escrita no checkout SVN | Confirmação explícita | Alterar checkout SVN de destino |
| Executar `svn status` | Leitura | Sem confirmação | Mostrar estado do checkout |
| Executar `svn update` | Operação sensível | Confirmação explícita | Atualizar checkout SVN pela base oficial |
| Commit SVN protegido | Operação sensível | Confirmação reforçada | Publicar alteração no SVN |
| Registrar histórico local | Escrita local controlada | Sem confirmação própria | Registrar evento local do app |

## Contrato: Salvar Ambiente Local

### Objetivo

Registrar uma combinação local reutilizável de workspace Git e checkout SVN.

### Entrada

- Nome amigável do ambiente.
- Caminho local do workspace Git.
- Caminho local do checkout SVN.

### Saída esperada

- Ambiente salvo localmente.
- Metadados mínimos detectados, quando disponíveis.
- Resultado da validação inicial.
- Indicação clara de que a configuração pode ser revalidada depois.

### Confirmação exigida

Confirmação simples antes de salvar.

### Falhas esperadas

- Nome vazio ou duplicado.
- Caminho Git inválido.
- Checkout SVN inválido.
- Falha ao detectar metadados com `svn info`.
- Falha de permissão para gravar configuração local.

### Bloqueios

O ambiente não deve ser salvo como válido quando:

- o workspace Git não puder ser validado;
- o checkout SVN não puder ser validado;
- o app não conseguir determinar o estado mínimo com segurança.

O app pode permitir salvar um rascunho de ambiente incompleto somente se ele ficar visualmente marcado como pendente de validação.

O contrato detalhado de dados fica em [ambientes-salvos.md](ambientes-salvos.md).

## Contrato: Detectar Branch Git

### Objetivo

Identificar o estado mínimo do workspace Git usado para preparar a alteração.

### Entrada

- Caminho local do repositório Git.
- Repositório Git válido.
- Base de comparação informada ou base padrão `main`.

### Saída esperada

- Nome da branch atual.
- Indicação se o repositório está em branch nomeada ou em estado destacado.
- Base de comparação em uso.
- Indicação se a base de comparação existe no repositório local.
- Lista mínima de arquivos alterados em relação à base.
- Indicação se há alterações detectadas.

### Confirmação exigida

Nenhuma. Esta é uma operação de leitura.

### Falhas esperadas

- Caminho não existe.
- Caminho não é um repositório Git.
- Branch não detectada.
- Repositório em detached HEAD.
- Base de comparação não configurada ou não encontrada.
- Falha ao listar arquivos alterados.
- Timeout de comando Git.

### Bloqueios

O fluxo de workspace deve bloquear quando:

- a branch de origem não for detectada;
- o repositório estiver em detached HEAD;
- a base de comparação necessária para gerar o patch não existir.

Falhas inesperadas de comando Git devem interromper o avanço e ser tratadas como erro, não como bloqueio recuperável simples.

### Mensagens e próximas ações

| Situação | Classificação | Mensagem sugerida | Próxima ação esperada |
| --- | --- | --- | --- |
| Repositório em detached HEAD | Bloqueio recuperável | `O repositório Git está em detached HEAD. Faça checkout de uma branch antes de continuar.` | Selecionar ou criar uma branch nomeada. |
| Base de comparação ausente | Bloqueio recuperável | `A base de comparação não foi encontrada no repositório Git local.` | Informar uma base existente ou atualizar o repositório local fora do SVNFlow. |
| Falha ao listar arquivos alterados | Erro inesperado | `Não foi possível listar os arquivos alterados do workspace Git.` | Verificar permissões, integridade do repositório e tentar novamente. |
| Timeout ao consultar workspace | Erro inesperado | `A validação do workspace Git excedeu o tempo limite.` | Verificar se o repositório está acessível e tentar novamente. |
| Nenhuma alteração encontrada | Bloqueio recuperável para exportação | `Nenhuma alteração foi encontrada em relação à base de comparação.` | Fazer alterações na branch ou escolher outra base. |

Bloqueio recuperável significa que a pessoa usuária pode ajustar o estado local e tentar novamente. Erro inesperado significa que o app não conseguiu determinar o estado com segurança.

## Contrato: Gerar `patch.diff`

### Objetivo

Gerar a alteração técnica que será transportada dentro do pacote `.svnflow`.

### Entrada

- Caminho local do repositório Git.
- Branch de origem detectada.
- Base de comparação definida.
- Lista de arquivos alterados.
- Dados preenchidos da mini PR local.

### Saída esperada

- Arquivo `patch.diff`.
- Lista de arquivos criados, modificados e removidos.
- Indicação de sucesso ou falha.
- Observações sobre arquivos não suportados na v1, quando existirem.

### Confirmação exigida

Confirmação simples na tela de exportação, depois da prévia.

### Falhas esperadas

- Nenhuma alteração detectada.
- Base de comparação inexistente.
- Falha ao gerar patch.
- Arquivo binário não representado adequadamente por patch.
- Problema de permissão para escrever o pacote local.

### Bloqueios

A geração do pacote deve bloquear quando:

- não houver arquivos alterados;
- o patch não puder ser gerado;
- campos obrigatórios da mini PR estiverem vazios;
- o destino local do pacote não puder ser escrito.

## Contrato: Validar Pacote `.svnflow`

### Objetivo

Confirmar que um pacote importado possui estrutura mínima válida para revisão e aplicação.

### Entrada

- Caminho local do arquivo `.svnflow`.

### Saída esperada

- Status de validade do pacote.
- Versão do formato.
- Metadados do `manifest.json`.
- Conteúdo renderizável do `pr.md`.
- Presença e estado do `patch.diff`.
- Lista de arquivos afetados.

### Confirmação exigida

Nenhuma. Esta é uma operação de leitura.

### Falhas esperadas

- Arquivo inexistente.
- Extensão inválida.
- Pacote corrompido.
- `manifest.json` ausente ou inválido.
- `pr.md` ausente.
- `patch.diff` ausente.
- Versão do formato não suportada.
- Checksum ou validação equivalente incompatível.

### Bloqueios

A importação deve bloquear quando:

- o pacote não puder ser aberto;
- arquivos obrigatórios estiverem ausentes;
- a versão do formato não for suportada;
- os metadados mínimos não forem válidos.

## Contrato: Validar Checkout SVN

### Objetivo

Confirmar que o destino escolhido é um checkout SVN adequado para receber uma alteração.

### Entrada

- Caminho local do checkout SVN.
- Política da operação: leitura, aplicação, atualização ou commit.

### Saída esperada

- Indicação se o caminho é um checkout SVN.
- Resultado resumido de `svn status`.
- Indicação se o checkout está limpo, sujo ou em estado bloqueante.
- Revisão atual quando disponível.

### Confirmação exigida

Nenhuma para validação. Esta é uma operação de leitura.

### Falhas esperadas

- Caminho não existe.
- Caminho não é checkout SVN.
- Comando SVN indisponível.
- Checkout com conflitos.
- Checkout com alterações locais não esperadas.
- Falha de permissão.

### Bloqueios

A aplicação de patch deve bloquear quando:

- o checkout SVN não for válido;
- houver conflito SVN;
- houver alterações locais incompatíveis;
- o estado do checkout não puder ser determinado.

## Contrato: Aplicar Patch

### Objetivo

Aplicar a alteração técnica de um pacote `.svnflow` no checkout SVN escolhido.

### Entrada

- Pacote `.svnflow` validado.
- `patch.diff` válido.
- Checkout SVN validado.
- Aceite explícito da pessoa usuária.

### Saída esperada

- Resultado da aplicação.
- Lista de arquivos afetados.
- `svn status` após a aplicação.
- Mensagens de falha ou conflito, quando existirem.
- Registro local da tentativa.

### Confirmação exigida

Confirmação explícita.

A interface deve deixar claro que a operação alterará arquivos no checkout SVN.

### Falhas esperadas

- Patch não encaixa no checkout SVN.
- Arquivo esperado não existe no destino.
- Arquivo já foi alterado no destino.
- Remoção não pôde ser aplicada.
- Falha de permissão.
- Diferenças de encoding ou fim de linha.
- Arquivo binário não suportado pelo patch da v1.

### Bloqueios

A aplicação deve bloquear quando:

- o pacote não estiver validado;
- o checkout SVN não estiver em estado permitido;
- a pessoa usuária não confirmar a aplicação;
- uma pré-validação indicar que o patch não encaixa.

Se a aplicação falhar, o SVNFlow deve parar o fluxo e mostrar mensagem clara. O app não deve tentar resolver conflitos automaticamente na v1.

## Contrato: Executar `svn status`

### Objetivo

Mostrar o estado atual do checkout SVN de forma compreensível.

### Entrada

- Caminho local do checkout SVN.

### Saída esperada

- Lista de arquivos com status SVN.
- Indicação visual de arquivos adicionados, modificados, removidos, não versionados ou conflitantes.
- Estado resumido do checkout.

### Confirmação exigida

Nenhuma. Esta é uma operação de leitura.

### Falhas esperadas

- Caminho inválido.
- Comando SVN indisponível.
- Saída do SVN não interpretável.
- Falha de permissão.

### Bloqueios

O fluxo deve bloquear etapas sensíveis quando o status indicar:

- conflito;
- alteração local inesperada;
- estado desconhecido;
- erro ao consultar SVN.

## Contrato: Executar `svn update`

### Objetivo

Atualizar o checkout SVN local com alterações já publicadas no repositório oficial.

### Entrada

- Caminho local do checkout SVN.
- Confirmação explícita da pessoa usuária.

### Saída esperada

- Resultado do update.
- Revisão final quando disponível.
- Arquivos recebidos, atualizados, removidos ou em conflito.
- `svn status` após a atualização.

### Confirmação exigida

Confirmação explícita.

A interface deve informar que a operação pode alterar arquivos locais do checkout SVN.

### Falhas esperadas

- Checkout SVN inválido.
- Conflito durante atualização.
- Falha de rede ou autenticação SVN.
- Alterações locais impedindo atualização segura.
- Comando SVN indisponível.

### Bloqueios

O `svn update` deve bloquear quando:

- o checkout não for SVN;
- o estado atual não puder ser determinado;
- houver alteração local em estado não permitido;
- a pessoa usuária não confirmar.

Se houver conflito, o SVNFlow deve registrar o estado e interromper o fluxo. A resolução automática de conflito fica fora da v1.

## Contrato: Commit SVN Protegido

### Objetivo

Publicar no SVN uma alteração já aplicada e validada.

### Entrada

- Checkout SVN válido.
- `svn status` revisado.
- Mensagem de commit preenchida.
- Confirmação reforçada da pessoa usuária.

### Saída esperada

- Resultado do commit.
- Revisão SVN gerada, quando disponível.
- Mensagem de sucesso ou falha.
- Registro local do evento.

### Confirmação exigida

Confirmação reforçada.

A interface deve destacar que esta operação publica alteração no SVN oficial.

### Falhas esperadas

- Mensagem de commit vazia.
- Checkout SVN inválido.
- Arquivos em conflito.
- Falha de autenticação SVN.
- Falha de rede.
- Repositório SVN rejeita o commit.

### Bloqueios

O commit deve bloquear quando:

- a mensagem estiver vazia;
- houver conflito;
- o status SVN não tiver sido revisado;
- o checkout não estiver validado;
- a pessoa usuária não confirmar explicitamente.

Na v1, o commit SVN pode ficar fora do primeiro protótipo funcional. Mesmo assim, o contrato deve existir para orientar a proteção da operação.

## Contrato: Registrar Histórico Local

### Objetivo

Registrar eventos locais do SVNFlow para consulta dentro da aplicação, sem criar auditoria oficial.

### Entrada

- Tipo do evento: exportação, importação, aplicação, atualização SVN, falha ou commit.
- Metadados mínimos do pacote ou operação.
- Status final da operação.
- Caminho local do pacote, quando existir.

### Saída esperada

- Registro local criado ou atualizado.
- Status visível no histórico da aplicação.
- Referência ao pacote local quando aplicável.

### Confirmação exigida

Nenhuma confirmação própria. O registro acompanha a operação executada.

### Falhas esperadas

- Falha de permissão para gravar histórico local.
- Caminho de histórico indisponível.
- Registro anterior inconsistente.

### Bloqueios

Falha ao registrar histórico não deve transformar uma operação bem-sucedida em falha técnica principal, mas deve ser exibida como alerta.

O histórico local não deve armazenar conteúdo completo de código, patch ou arquivos sensíveis como fonte principal. Ele deve guardar metadados e referência local ao pacote.

O modelo mínimo do registro está definido em [Histórico Local](historico-local.md).

## Estados Bloqueantes Gerais

O SVNFlow deve impedir avanço seguro quando detectar:

- repositório Git inválido;
- checkout SVN inválido;
- pacote `.svnflow` inválido;
- branch Git não detectada;
- base de comparação ausente;
- checkout SVN com conflito;
- patch incompatível com destino;
- comando Git ou SVN indisponível;
- ausência de confirmação em operação protegida;
- falha ao determinar estado de segurança.

## Próximas Validações Técnicas

Com estes contratos definidos, as próximas provas técnicas devem validar:

- geração de `patch.diff`;
- aplicação do patch em checkout SVN fictício;
- execução de `svn update` em ambiente de teste;
- comportamento com arquivos criados, modificados e removidos;
- mensagens de falha candidatas para a interface;
- limites do histórico local.
