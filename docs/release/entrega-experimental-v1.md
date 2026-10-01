# Entrega Experimental da V1

## Objetivo

Este documento explica como executar a V1 do SVNFlow, onde ficam os dados locais e quais limitações são conhecidas.

A V1 é uma entrega experimental. Valide o fluxo em ambiente fictício antes de usar em um checkout SVN real.

Os critérios que definem a V1 ficam em [Critérios de Pronto da V1](criterios-pronto-v1.md). O uso passo a passo fica no [Manual de Uso da V1](../uso/manual-de-uso-v1.md).

## O Que a V1 Entrega

O fluxo principal é **Sincronizar** ([ADR-007](../adrs/ADR-007-sincronizacao-por-espelhamento.md)): o app deixa o checkout SVN igual ao último commit do Git e publica com um commit SVN.

| Etapa | O que faz |
| --- | --- |
| Ambiente | Cadastra o repositório Git e o checkout SVN, com escolha de pasta e validação. |
| Sincronizar | Compara o último commit do Git com o checkout e mostra o que será criado, atualizado e removido. Após confirmação, copia os arquivos e roda `svn add`/`svn delete`. Em seguida, sugere uma mensagem de commit editável e publica após nova confirmação. |
| Histórico | Commits SVN publicados, com o commit Git correspondente. |

As etapas abaixo ficam em **Modo avançado**, para o fluxo por patch e pacotes `.svnflow`:

| Etapa | O que faz |
| --- | --- |
| Ambiente | Cadastra workspace Git, checkout SVN e base de comparação, com escolha de pasta, validação, revalidação e remoção da lista. |
| Workspace Git | Mostra branch, base e arquivos alterados, e bloqueia `detached HEAD` e base inexistente. |
| Preview | Faz a revisão técnica somente leitura, com bloqueios e alertas (arquivos binários, alterações não commitadas). |
| Pacotes | Mini PR com campos obrigatórios e prévia do `pr.md`, exportação com `patch.diff`, listagem da pasta local, abertura por seletor de arquivo e revisão do pacote. |
| Aplicação SVN | Pré-validação com `git apply --check`, confirmação explícita, aplicação, `svn add`/`svn delete` dos arquivos criados e removidos, e `svn status` ao final. |
| Commit SVN | Validação do checkout, lista do que será publicado, mensagem validada, confirmação explícita e revisão retornada. |
| Histórico | Eventos locais de exportação, importação, aplicação e commit. |

## Pré-Requisitos

- Node.js 20 ou superior.
- Git disponível no `PATH`.
- Cliente de linha de comando do SVN (`svn`) disponível no `PATH`.
- Um workspace Git e um checkout SVN com a mesma estrutura de pastas a partir da raiz.

## Como Executar

Para usar sem clonar o repositório, baixe o instalador na página de Releases: veja [Instalar o SVNFlow no Linux](instalacao-linux.md).

Para executar a partir do código:

```bash
npm ci
npm run app
```

`npm run app` compila o projeto e abre a janela do Electron.

Para validar a instalação:

```bash
npm test
```

A suíte inclui um teste ponta a ponta que cria um repositório SVN e um Git temporários, exporta um pacote, aplica no checkout e faz o commit. Esse teste é ignorado quando `git`, `svn` ou `svnadmin` não estão disponíveis.

Se o Electron abrir como Node puro (erro dizendo que o módulo `electron` não exporta `app` ou `BrowserWindow`), a variável `ELECTRON_RUN_AS_NODE` está definida no terminal. Remova a variável e execute de novo.

Para gerar os instaladores Linux localmente (`release/`):

```bash
npm run dist
```

Ao enviar uma tag `vX.Y.Z` igual à versão do `package.json`, o workflow `Release Linux` gera os mesmos arquivos e publica a Release.

## Dados Locais

O app grava apenas na pasta do usuário e nos caminhos escolhidos pela pessoa:

| Arquivo ou pasta | Conteúdo |
| --- | --- |
| `~/.svnflow/saved-environments.json` | Ambientes salvos. |
| `~/.svnflow/settings.json` | Tema escolhido em Aparência e pasta de pacotes. |
| `~/.svnflow/packages/` | Pasta padrão de pacotes exportados. |
| `~/.svnflow/package-history.json` | Histórico local. |

Nenhum dado é enviado para servidor externo. Remover um ambiente da lista não apaga pastas.

## Limitações Conhecidas

### Sincronizar

- **Só o último commit.** Alterações não commitadas no Git não entram, e o app avisa quando elas existem.
- **O Git manda.** Arquivos e pastas versionados no SVN que não existem no Git são removidos. Edições feitas direto no checkout SVN são sobrescritas.
- **Um commit SVN por sincronização.** Os commits Git aparecem listados na mensagem, não como revisões separadas.
- **Fim de linha.** A comparação é byte a byte. Se o checkout usa `svn:eol-style` com conversão (comum no Windows), arquivos podem aparecer como alterados sem mudança real.
- **Links simbólicos e submódulos** não são copiados.
- **Sem `svn update`.** Atualize o checkout fora do app se outra pessoa também commita no SVN.

### Modo avançado

- **Só commits entram no preview.** A diferença é calculada entre a base e a branch atual (`base...HEAD`). Alterações não commitadas aparecem como alerta, mas não entram no patch.
- **Estrutura igual nos dois lados.** O patch é aplicado a partir da raiz do checkout SVN cadastrado. Se o checkout corresponder a uma subpasta do repositório Git, a pré-validação falha.
- **Sem `svn update`.** O app não atualiza o checkout. Atualize-o fora do app antes de aplicar. Quando o checkout está desatualizado, a pré-validação bloqueia com a mensagem de patch que não encaixa.
- **Renomeações viram remoção mais criação.** No SVN, o arquivo renomeado aparece como `D` e `A`, sem histórico de cópia.
- **Binários.** Arquivos binários vão no patch em formato binário do Git. O fluxo foi validado com arquivos de texto; binários devem ser revisados com cuidado.
- **O commit publica o checkout inteiro.** Se o checkout já tinha alterações locais antes da aplicação, elas entram no mesmo commit. A tela de aplicação avisa quando isso acontece.
- **Arquivos não versionados bloqueiam o commit.** O app não ignora nem versiona automaticamente arquivos `?` que não vieram do patch.
- **Histórico sem falhas de aplicação.** Falhas aparecem na tela, mas não são gravadas.
- **Pacote em JSON.** O formato é um JSON único ([ADR-006](../adrs/ADR-006-pacote-svnflow-json-v1.md)). Pacotes `1.0.0`, gerados antes desta entrega, só podem ser revisados.
- **Só Linux empacotado.** Há `.deb` e `.AppImage` ([instalação no Linux](instalacao-linux.md)). Em outros sistemas, rode a partir do repositório com `npm run app`.
- **Credenciais SVN.** O commit roda sem terminal (`--non-interactive`). As credenciais precisam estar salvas no cache do SVN.
- **Revalidação.** Um ambiente validado há mais de 60 minutos aparece como "Atenção" até ser revalidado.
