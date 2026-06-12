# Tela de Ambiente: Planejamento do Protótipo

## Objetivo

Definir o comportamento da tela ou área de Ambiente no protótipo navegável da V1.

Esta tela é o ponto de entrada do SVNFlow. Ela valida o estado mínimo do ambiente antes de qualquer operação e orienta a pessoa usuária sobre o que ajustar quando o ambiente estiver incompleto.

Na V1, a tela também deve permitir escolher um ambiente salvo ou cadastrar um novo ambiente local.

Este documento não define layout final, componentes definitivos ou tokens visuais próprios.

## Relação com a M1

A tela de Ambiente usa os resultados de `validateEnvironmentState(input)` para determinar qual estado exibir.

Os estados possíveis do ambiente são:

- `ready` — Git e SVN disponíveis, caminhos válidos;
- `error` — Git ou SVN disponíveis, mas com problema detectado na validação de caminho ou workspace;
- `blocked` — Git ou SVN ausentes no sistema.

## Estados da Tela

### Estado: Pronto (`ready`)

**Quando ocorre:** Git e SVN estão disponíveis, o repositório Git e o checkout SVN são válidos.

**O que a tela exibe:**

- indicação visual de ambiente pronto;
- confirmação de que o repositório Git e o checkout SVN foram reconhecidos;
- botão ou ação para avançar ao próximo passo (seleção de workspace).

**Próxima ação esperada:** avançar para a seleção do workspace Git.

---

### Estado: Erro (`error`)

**Quando ocorre:** Git e SVN estão disponíveis, mas o caminho informado é inválido ou o workspace Git apresenta problema detectável (ex.: HEAD desanexado, sem alterações para exportar).

**O que a tela exibe:**

- indicação visual de problema;
- descrição do problema detectado (mensagem da M1, ex.: "O caminho informado não é um repositório Git válido");
- orientação sobre o que a pessoa usuária deve corrigir;
- opção de alterar os caminhos configurados.

**Próxima ação esperada:** corrigir o caminho ou resolver a condição de erro e tentar novamente.

---

### Estado: Bloqueado (`blocked`)

**Quando ocorre:** Git ou SVN não estão instalados ou acessíveis no sistema.

**O que a tela exibe:**

- indicação visual de bloqueio;
- identificação de qual ferramenta está ausente (Git, SVN ou ambos);
- mensagem da M1 correspondente (ex.: "Git não encontrado. Instale o Git e reinicie o SVNFlow.");
- sem opção de avançar enquanto o bloqueio persistir.

**Próxima ação esperada:** instalar ou corrigir a ferramenta ausente e reiniciar o SVNFlow.

---

## Entradas da Tela

A tela recebe:

- ambiente salvo selecionado, quando existir;
- caminho do repositório Git (configurado pelo usuário ou detectado);
- caminho do checkout SVN (configurado pelo usuário ou detectado).

Esses caminhos são passados como `EnvironmentStateInput` para `validateEnvironmentState()`.

## Ambientes Salvos

A tela deve listar ambientes salvos localmente com:

- nome amigável;
- caminho do workspace Git;
- caminho do checkout SVN;
- URL SVN detectada, quando disponível;
- status da última validação.

Ao selecionar um ambiente salvo, o app deve revalidar os caminhos antes de permitir avanço.

Ao cadastrar um novo ambiente, a pessoa usuária deve selecionar pastas locais. O app deve detectar dados do checkout por leitura local, como `svn info`, sem exigir que a pessoa informe manualmente o nome técnico do repositório SVN remoto.

## Mensagens da M1

As mensagens exibidas na tela seguem as definidas em `docs/prototipos/plano-prototipo-v1.md`:

| Situação | Mensagem |
| --- | --- |
| Git ausente | "Git não encontrado. Instale o Git e reinicie o SVNFlow." |
| SVN ausente | "SVN não encontrado. Instale o SVN e reinicie o SVNFlow." |
| Caminho Git inválido | "O caminho informado não é um repositório Git válido." |
| Checkout SVN inválido | "O caminho informado não é um checkout SVN válido." |

## Diretriz Visual

O protótipo navegável deve referenciar o Design System da YA LABS (documentado no YABook) para manter consistência visual.

Os estados devem ser distinguíveis visualmente, com indicadores claros de:

- sucesso (ambiente pronto para avançar);
- atenção (erro corrigível);
- bloqueio (ação necessária antes de continuar).

A tela não precisa definir componentes, tokens de cor ou tipografia definitivos.

## Fora de Escopo

- Layout final ou especificação visual definitiva.
- Escolha de biblioteca de componentes ou framework de UI.
- Implementação da tela no app desktop.
- Suporte a múltiplos workspaces simultâneos no mesmo fluxo ativo.
- Navegação remota em servidores SVN.
- Sincronização de ambientes salvos entre máquinas.
