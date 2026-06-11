# Ambiente Fictício de Validação da M1

## Objetivo

Definir um cenário local fictício para validar as funções de detecção de Git e SVN da M1 sem uso de código corporativo real.

Este documento não define automação final, ambiente de produção ou fluxo de CI.

## Relação com a M1

As funções validadas neste cenário são:

- `validateGitAvailability()` — detecta se o Git está acessível;
- `validateGitRepository(path)` — detecta se um caminho é um repositório Git válido;
- `validateSvnAvailability()` — detecta se o SVN está acessível;
- `validateSvnCheckout(path)` — detecta se um caminho é um checkout SVN válido;
- `validateEnvironmentState(input)` — agrega os quatro resultados acima.

## Estrutura do Cenário

O cenário usa dois diretórios locais fictícios:

```text
/tmp/svnflow-ficticio/
├── git-repo/          ← repositório Git inicializado localmente
└── svn-checkout/      ← checkout SVN simulado localmente
```

Nenhum diretório contém código corporativo real.

## Repositório Git Fictício

### Como criar

```bash
mkdir -p /tmp/svnflow-ficticio/git-repo
cd /tmp/svnflow-ficticio/git-repo
git init
git commit --allow-empty -m "chore: commit inicial ficticio"
```

### Verificação esperada

```bash
git -C /tmp/svnflow-ficticio/git-repo rev-parse --git-dir
# saída: .git
```

### Caminho inválido para teste negativo

```bash
mkdir -p /tmp/svnflow-ficticio/pasta-sem-git
# diretório existe, mas não é um repositório Git
```

## Checkout SVN Fictício

O SVN exige um servidor ou repositório local (`svnadmin`) para criar um checkout real. Este cenário usa um repositório SVN local como alternativa ao servidor remoto.

### Como criar

```bash
# 1. Criar repositório SVN local
svnadmin create /tmp/svnflow-ficticio/svn-repo

# 2. Fazer checkout desse repositório local
svn checkout file:///tmp/svnflow-ficticio/svn-repo /tmp/svnflow-ficticio/svn-checkout
```

### Verificação esperada

```bash
svn info --show-item wc-root /tmp/svnflow-ficticio/svn-checkout
# saída: /tmp/svnflow-ficticio/svn-checkout
```

### Caminho inválido para teste negativo

```bash
mkdir -p /tmp/svnflow-ficticio/pasta-sem-svn
# diretório existe, mas não é um checkout SVN
```

## Limites do Cenário

- O repositório SVN local usa `file://`, não um servidor remoto. Comportamentos de rede e autenticação não são cobertos.
- O repositório Git é vazio (sem commits de conteúdo), apenas suficiente para ativar `.git`.
- Nenhuma alteração real é feita nos diretórios durante os testes.
- O cenário não cobre workspace Git com branches, alterações em andamento ou conflitos.

## Reprodução

Para reproduzir o cenário completo a partir de um terminal limpo:

```bash
# Limpar ambiente anterior
rm -rf /tmp/svnflow-ficticio

# Git
mkdir -p /tmp/svnflow-ficticio/git-repo
cd /tmp/svnflow-ficticio/git-repo
git init
git commit --allow-empty -m "chore: commit inicial ficticio"

# SVN
svnadmin create /tmp/svnflow-ficticio/svn-repo
svn checkout file:///tmp/svnflow-ficticio/svn-repo /tmp/svnflow-ficticio/svn-checkout

# Caminhos inválidos para casos negativos
mkdir -p /tmp/svnflow-ficticio/pasta-sem-git
mkdir -p /tmp/svnflow-ficticio/pasta-sem-svn
```

Após executar os passos acima, os quatro caminhos estarão disponíveis para as provas técnicas documentadas em `prova-tecnica-validacao-git.md` e `prova-tecnica-validacao-svn.md`.
