# Prova Técnica: Validação de SVN em Ambiente Fictício

## Objetivo

Documentar a prova técnica das funções de detecção de SVN da M1, executadas sobre o ambiente fictício definido em `ambiente-ficticio-m1.md`.

Esta prova valida as funções `validateSvnAvailability()` e `validateSvnCheckout(path)` em cenários reais de terminal, sem código corporativo real.

Este documento não define implementação final, interface ou comportamento de produção.

## Relação com a M1

As funções validadas estão em `src/main/commands/svn.ts`:

- `validateSvnAvailability()` — executa `svn --version --quiet` e detecta se o SVN está acessível no sistema;
- `validateSvnCheckout(path)` — executa `svn info --show-item wc-root "${path}"` e detecta se o caminho é um checkout SVN válido.

Os testes automatizados dessas funções estão em `src/main/commands/__tests__/svn.test.ts`.

Esta prova técnica complementa os testes automatizados com evidência de execução real em ambiente local.

## Pré-condição

O ambiente fictício deve estar criado conforme `ambiente-ficticio-m1.md`.

Caminhos utilizados:

- `/tmp/svnflow-ficticio/svn-checkout` — checkout SVN válido (criado via `file://`);
- `/tmp/svnflow-ficticio/pasta-sem-svn` — diretório sem checkout SVN.

## Caso 1: SVN disponível no sistema

### Comando executado

```bash
svn --version --quiet
```

### Saída observada

```text
1.14.1
```

### Resultado esperado pela função

```json
{
  "status": "available",
  "version": "1.14.1"
}
```

### Resultado

Passou. SVN está disponível e a versão é detectada corretamente.

## Caso 2: Caminho válido de checkout SVN

### Comando executado

```bash
svn info --show-item wc-root /tmp/svnflow-ficticio/svn-checkout
```

### Saída observada

```text
/tmp/svnflow-ficticio/svn-checkout
```

### Resultado esperado pela função

```json
{
  "status": "valid",
  "path": "/tmp/svnflow-ficticio/svn-checkout"
}
```

### Resultado

Passou. O caminho é reconhecido como checkout SVN válido.

## Caso 3: Caminho inválido (diretório sem checkout SVN)

### Comando executado

```bash
svn info --show-item wc-root /tmp/svnflow-ficticio/pasta-sem-svn
```

### Saída observada

```text
svn: E200009: '/tmp/svnflow-ficticio/pasta-sem-svn' is not a working copy
exit code: 1
```

### Resultado esperado pela função

```json
{
  "status": "invalid",
  "path": "/tmp/svnflow-ficticio/pasta-sem-svn",
  "reason": "not a working copy"
}
```

### Resultado

Passou. A função detecta corretamente que o caminho não é um checkout SVN.

## Caso 4: SVN não disponível no sistema (simulado)

Este caso não foi executado no ambiente fictício, pois o sistema possui SVN instalado. O comportamento é coberto pelos testes automatizados em `svn.test.ts` via mock de `execSync` com erro `ENOENT`.

### Resultado esperado pela função

```json
{
  "status": "unavailable"
}
```

## Limites da Prova

- A prova usa `file://` como protocolo SVN, não um servidor remoto. Comportamentos de rede, autenticação e acesso remoto não são cobertos.
- O checkout SVN fictício está vazio. A detecção de validade não depende de conteúdo no working copy.
- A prova não cobre checkouts SVN com conflitos, metadados corrompidos ou permissões restritas.
- Timeouts não foram simulados nesta prova (cobertos em testes automatizados).
- Erros de servidor SVN remoto inacessível não são cobertos por este cenário.
