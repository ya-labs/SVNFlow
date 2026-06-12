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
  -> gerar preview
  -> exportar pacote .svnflow
  -> importar pacote .svnflow
  -> revisar pr.md
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
  -> gerar preview
  -> revisar arquivos afetados
  -> aplicar no checkout SVN
  -> consultar svn status
  -> revisar commit SVN protegido
  -> consultar histórico local
```

## Fluxo Colaborativo

O fluxo colaborativo usa pacote `.svnflow` como meio local de transporte e revisão.

Ele não substitui GitHub, não cria servidor próprio e não transforma o SVNFlow em plataforma de Pull Request.

```text
Exportar pacote .svnflow
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

Ambientes salvos funcionam como atalhos locais. Mesmo quando um ambiente já existe, o app deve revalidar o estado atual antes de operações sensíveis.

Falhas de ambiente devem bloquear o avanço e indicar o próximo ajuste necessário.

## 2. Workspace Git

A pessoa seleciona ou confirma o repositório Git local.

O app identifica branch de origem, base de comparação e arquivos alterados.

## 3. Preview de alterações

Antes de exportar ou aplicar qualquer alteração, o app deve mostrar:

- branch de origem;
- base de comparação;
- arquivos criados, modificados e removidos;
- riscos ou limitações detectadas;
- dados que serão usados no pacote.

## 4. Pacote `.svnflow`

A exportação gera um pacote revisável com `manifest.json`, `pr.md` e `patch.diff`.

A importação valida o pacote e renderiza o `pr.md` antes de qualquer aplicação no checkout SVN.

## 5. Aplicação no SVN

Depois do aceite explícito, o app aplica o `patch.diff` no checkout SVN validado.

Aplicar patch não significa publicar no SVN.

## 6. Commit SVN protegido

O commit SVN é uma operação sensível e deve continuar separado da aplicação do patch.

Antes do commit, o app deve mostrar estado, resumo e confirmação explícita.

## 7. Histórico local

O histórico local registra metadados simples de pacotes exportados e importados.

Ele não é auditoria oficial e não deve substituir GitHub, SVN ou registros da organização.
