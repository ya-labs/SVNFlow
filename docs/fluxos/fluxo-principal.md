# Fluxo Principal da V1

## Objetivo

Este documento descreve a jornada principal de uso do SVNFlow na V1.

Fluxos explicam a sequência de uso. Requisitos e contratos ficam em documentos próprios.

## Jornada Principal

```text
Preparar ambiente
  -> selecionar workspace Git
  -> validar Git e SVN
  -> selecionar branch de origem
  -> gerar preview do workspace
  -> revisar arquivos afetados
  -> abrir Pacotes
  -> exportar ou importar pacote .svnflow
  -> revisar pr.md quando houver pacote importado
  -> aplicar patch no checkout SVN
  -> consultar svn status
  -> revisar e executar commit SVN protegido
```

## Fluxo Solo

O fluxo solo é o caminho principal da V1.

A mesma pessoa prepara a alteração no Git local, revisa o impacto, aplica no checkout SVN e segue para commit protegido quando adequado.

```text
Validar ambiente
  -> selecionar ou cadastrar ambiente salvo
  -> escolher branch e base
  -> gerar preview do workspace
  -> revisar arquivos afetados
  -> aplicar no checkout SVN
  -> consultar svn status
  -> revisar commit SVN protegido
  -> consultar histórico local
```

O fluxo solo não depende de pacote `.svnflow`. O pacote é útil quando a pessoa quer transportar a alteração, registrar uma mini PR local ou compartilhar a alteração com outra pessoa.

## Fluxo Solo Com Pacote Local

Quando a pessoa quer gerar um pacote para registrar ou compartilhar depois, o fluxo solo pode passar pela etapa Pacotes antes da aplicação.

```text
Validar ambiente
  -> selecionar ou cadastrar ambiente salvo
  -> escolher branch e base
  -> gerar preview do workspace
  -> revisar arquivos afetados
  -> abrir Pacotes
  -> preencher dados da mini PR
  -> exportar pacote .svnflow
  -> aplicar no checkout SVN
  -> consultar svn status
  -> revisar commit SVN protegido
  -> consultar histórico local
```

## Fluxo Colaborativo

O fluxo colaborativo usa pacote `.svnflow` como meio local de transporte e revisão.

Ele não substitui GitHub, não cria servidor próprio e não transforma o SVNFlow em plataforma de Pull Request.

```text
Gerar preview do workspace
  -> abrir Pacotes
  -> preencher dados da mini PR
  -> exportar pacote .svnflow
  -> compartilhar pacote por canal permitido
  -> importar pacote .svnflow
  -> revisar pr.md
  -> validar patch e checkout SVN
  -> aplicar no checkout SVN
  -> consultar svn status
  -> seguir para commit SVN protegido quando adequado
```

## 1. Preparar ambiente

O app deve validar se Git e SVN estão disponíveis e se os caminhos selecionados fazem sentido.

A pessoa pode escolher um ambiente salvo ou cadastrar um novo ambiente informando workspace Git local e checkout SVN local.

O ambiente salvo é persistido localmente em um arquivo JSON com os metadados mínimos necessários para seleção e revalidação.

Ambientes salvos funcionam como atalhos locais. Mesmo quando um ambiente já existe, o app deve revalidar o estado atual antes de operações sensíveis.

Falhas de ambiente devem bloquear o avanço e indicar o próximo ajuste necessário.

## 2. Workspace Git

A pessoa seleciona ou confirma o repositório Git local.

O app identifica branch de origem, base de comparação e arquivos alterados.

## 3. Preview de alterações

O Preview é a etapa de leitura técnica do workspace Git.

Antes de exportar pacote ou aplicar qualquer alteração, o app deve mostrar:

- branch de origem;
- base de comparação;
- arquivos criados, modificados e removidos;
- resumo técnico da diferença;
- riscos ou limitações detectadas.

O Preview não deve ser a fonte principal dos campos humanos do `pr.md`. Ele pode sugerir informações para o pacote, mas sua responsabilidade é responder se há alteração detectada, quais arquivos mudaram e qual base está sendo comparada.

## 4. Pacote `.svnflow`

A etapa Pacotes concentra a experiência de exportação, importação, revisão e exploração de pacotes `.svnflow`.

Ela deve permitir:

- escolher ou visualizar a pasta local de pacotes;
- listar pacotes recentes, exportados e importados;
- exportar pacote a partir do Preview validado;
- preencher os campos estruturados que geram o `pr.md`;
- importar pacote local;
- validar estrutura, versão e integridade;
- renderizar o `pr.md` antes da aplicação.

A exportação gera um pacote revisável com `manifest.json`, `pr.md` e `patch.diff`.

A importação valida o pacote e renderiza o `pr.md` antes de qualquer aplicação no checkout SVN.

Exportação e importação podem coexistir na mesma etapa visual, desde que a interface diferencie claramente:

- criar pacote a partir do workspace atual;
- abrir pacote existente;
- revisar pacote importado;
- seguir para aplicação no checkout SVN.

## 5. Aplicação no SVN

Depois do aceite explícito, o app aplica o `patch.diff` no checkout SVN validado.

Aplicar patch não significa publicar no SVN.

## 6. Commit SVN protegido

O commit SVN é uma operação sensível e deve continuar separado da aplicação do patch.

Antes do commit, o app deve mostrar estado, resumo e confirmação explícita.

## 7. Histórico local

O histórico local registra metadados simples de pacotes exportados e importados.

Ele não é auditoria oficial e não deve substituir GitHub, SVN ou registros da organização.

## Checklist de Implementação Derivado

Esta redefinição gera os seguintes blocos implementáveis:

- tornar a etapa Preview uma revisão técnica do workspace, sem campos principais de mini PR;
- mover os campos humanos do `pr.md` para a etapa Pacotes;
- permitir exportar pacote a partir de um Preview validado;
- permitir importar pacote na mesma etapa Pacotes;
- permitir listar pacotes a partir de uma pasta local configurada ou selecionada;
- permitir selecionar arquivo `.svnflow` manualmente como alternativa;
- renderizar `pr.md` e metadados do pacote antes da aplicação;
- diferenciar visualmente pacote exportado, pacote importado, pacote revisado e pacote aplicado;
- manter aplicação no checkout SVN como etapa sensível separada;
- manter commit SVN protegido como etapa separada da aplicação.

Esses blocos devem ser implementados em issues pequenas quando a redefinição sair da documentação para código.
