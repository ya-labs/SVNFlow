# Prova Técnica: Validação de Git em Ambiente Fictício

## Objetivo

Documentar a prova técnica das funções de detecção de Git da M1, executadas sobre o ambiente fictício definido em `ambiente-ficticio-m1.md`.

Esta prova valida as funções `validateGitAvailability()` e `validateGitRepository(path)` em cenários reais de terminal, sem código corporativo real.

Este documento não define implementação final, interface ou comportamento de produção.

## Relação com a M1

As funções validadas estão em `src/main/commands/git.ts`:

- `validateGitAvailability()` — executa `git --version` e detecta se o Git está acessível no sistema;
- `validateGitRepository(path)` — executa `git -C "${path}" rev-parse --git-dir` e detecta se o caminho é um repositório Git válido.

Os testes automatizados dessas funções estão em `src/main/commands/__tests__/git.test.ts`.

Esta prova técnica complementa os testes automatizados com evidência de execução real em ambiente local.

## Pré-condição

O ambiente fictício deve estar criado conforme `ambiente-ficticio-m1.md`.

Caminhos utilizados:

- `/tmp/svnflow-ficticio/git-repo` — repositório Git válido;
- `/tmp/svnflow-ficticio/pasta-sem-git` — diretório sem repositório Git.

## Caso 1: Git disponível no sistema

### Comando executado

```bash
git --version
```

### Saída observada

```text
git version 2.43.0
```

### Resultado esperado pela função

```json
{
  "status": "available",
  "version": "2.43.0"
}
```

### Resultado

Passou. Git está disponível e a versão é detectada corretamente.

## Caso 2: Caminho válido de repositório Git

### Comando executado

```bash
git -C /tmp/svnflow-ficticio/git-repo rev-parse --git-dir
```

### Saída observada

```text
.git
```

### Resultado esperado pela função

```json
{
  "status": "valid",
  "path": "/tmp/svnflow-ficticio/git-repo"
}
```

### Resultado

Passou. O caminho é reconhecido como repositório Git válido.

## Caso 3: Caminho inválido (diretório sem `.git`)

### Comando executado

```bash
git -C /tmp/svnflow-ficticio/pasta-sem-git rev-parse --git-dir
```

### Saída observada

```text
fatal: not a git repository (or any of the parent directories): .git
exit code: 128
```

### Resultado esperado pela função

```json
{
  "status": "invalid",
  "path": "/tmp/svnflow-ficticio/pasta-sem-git",
  "reason": "not a git repository"
}
```

### Resultado

Passou. A função detecta corretamente que o caminho não é um repositório Git.

## Caso 4: Git não disponível no sistema (simulado)

Este caso não foi executado no ambiente fictício, pois o sistema possui Git instalado. O comportamento é coberto pelos testes automatizados em `git.test.ts` via mock de `execSync` com erro `ENOENT`.

### Resultado esperado pela função

```json
{
  "status": "unavailable"
}
```

## Limites da Prova

- A prova não cobre sistemas sem Git instalado (simulado apenas nos testes automatizados).
- O repositório Git fictício não tem branches ou commits de conteúdo. A detecção de disponibilidade de repositório não depende de histórico.
- A prova não cobre repositórios Git com falhas de permissão ou corrupção de índice.
- Timeouts não foram simulados nesta prova (cobertos em testes automatizados).
