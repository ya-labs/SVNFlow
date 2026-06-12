# Ajustes Operacionais

Registro versionado de ajustes contínuos leves de processo, nomenclatura, organização e fluxo de trabalho.

Cada ajuste é aplicado direto na `main` e registrado aqui com referência ao commit.

---

## 2026-06-12

**Commit:** `00c079b`
**Tipo:** docs/prod
**O que mudou:** Criado o manual de uso da V1 com trilhas de trabalho solo e colaboração por pacote `.svnflow`.
**Por quê:** Deixar explícito que o modo solo é o fluxo principal da V1 e que a colaboração é uma camada adicional, sem virar plataforma colaborativa completa.
**Impacto:** Escopo da V1, requisitos e fluxo principal passam a registrar a jornada solo, os bloqueios necessários para uso individual seguro e o fechamento com preview, aplicação, `svn status`, commit protegido e histórico local.

## 2026-06-11

**Commit:** `77d1eae`  
**Tipo:** docs/proc  
**O que mudou:** Registrado padrão de issue fixa para ajustes contínuos em `docs/processos/fluxo-de-trabalho-github.md`.  
**Por quê:** Reduzir atrito de processo para mudanças leves de governança operacional que afetam fluxo de trabalho.  
**Impacto:** Mudanças pequenas de nomenclatura, padrão de commit, regras de organização podem ir direto na `main` sem PR de processo. Issue #86 é entrada de visibilidade.

**Commit:** `edbe5cc`  
**Tipo:** docs/proc  
**O que mudou:** Corrigida a tipagem dos testes no editor com separação entre `tsconfig.json` e `tsconfig.build.json`.  
**Por quê:** Manter o Error Lens limpo no VS Code sem incluir testes no build principal.  
**Impacto:** Arquivos de teste voltam a ser reconhecidos com tipos de Node e Jest, enquanto o build continua excluindo testes.
