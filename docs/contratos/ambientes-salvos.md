# Ambientes Salvos

## Objetivo

Ambientes salvos permitem que a pessoa usuária reutilize combinações locais de workspace Git e checkout SVN sem precisar informar os caminhos manualmente a cada uso.

Na V1, um ambiente salvo representa uma configuração local de trabalho. Ele não representa um cadastro remoto de repositórios SVN, não navega servidores SVN e não armazena credenciais.

## Modelo Conceitual

Um ambiente salvo deve conter metadados suficientes para identificação, seleção e validação.

Campos mínimos:

| Campo | Descrição |
| --- | --- |
| `id` | Identificador local gerado pelo app. |
| `nome` | Apelido amigável definido pela pessoa usuária. |
| `gitWorkspacePath` | Caminho local do workspace Git. |
| `svnCheckoutPath` | Caminho local do checkout SVN. |
| `svnUrl` | URL detectada por `svn info`, quando disponível. |
| `svnCheckoutRoot` | Raiz do checkout detectada por `svn info`, quando disponível. |
| `svnRevision` | Revisão local detectada, quando disponível. |
| `lastValidatedAt` | Data da última validação local. |
| `lastValidationStatus` | Resultado resumido da última validação. |

## Fluxo de Cadastro

Para cadastrar um ambiente, o app deve:

1. permitir selecionar uma pasta local de workspace Git;
2. permitir selecionar uma pasta local de checkout SVN;
3. validar se os caminhos selecionados são compatíveis;
4. executar leitura de metadados locais, como `svn info`;
5. sugerir ou solicitar um nome amigável;
6. salvar apenas a configuração local e os metadados necessários.

O usuário deve escolher o ambiente pelo nome amigável, não por detalhes técnicos da URL SVN.

## Fluxo de Seleção

Ao abrir o app, a pessoa usuária deve poder escolher um ambiente salvo.

Depois da seleção, o SVNFlow deve revalidar o ambiente antes de permitir operações sensíveis.

A última validação registrada serve apenas como indicação visual inicial. Ela não substitui a validação atual do Git, SVN, workspace e checkout.

## O Que Deve Ser Mostrado

A interface pode mostrar:

- nome do ambiente;
- caminho do workspace Git;
- caminho do checkout SVN;
- URL SVN detectada;
- revisão SVN local detectada;
- status da última validação;
- alerta quando o ambiente precisar ser revalidado.

## Restrições

Ambientes salvos não devem armazenar:

- credenciais de SVN;
- conteúdo de arquivos versionados;
- patches;
- pacotes `.svnflow`;
- logs com conteúdo sensível;
- caminhos, nomes ou URLs reais em exemplos públicos.

## Fora da V1

Na V1, ambientes salvos não devem:

- criar checkout SVN a partir de URL remota;
- navegar diretórios de um servidor SVN;
- gerenciar credenciais;
- sincronizar ambientes entre máquinas;
- resolver divergências entre ambientes de pessoas diferentes.

Essas capacidades podem ser reavaliadas em versões futuras.
