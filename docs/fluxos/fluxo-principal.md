# Fluxo Principal da V1

## Objetivo

Este documento descreve a jornada principal de uso do SVNFlow na V1.

Fluxos explicam a sequência de uso. Requisitos e contratos ficam em documentos próprios.

## Jornada principal

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

## 1. Preparar ambiente

O app deve validar se Git e SVN estão disponíveis e se os caminhos informados fazem sentido.

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

