# Ajustes Operacionais

Registro versionado de ajustes relevantes de processo, nomenclatura, organização e fluxo de trabalho.

Este arquivo não é obrigatório para toda alteração pequena. Use-o apenas quando o commit mudar uma regra recorrente de trabalho ou quando o motivo da mudança precisar ficar fácil de consultar depois.

---

## 2026-06-12

**Commit:** commit que introduz esta entrada
**Tipo:** docs/proc
**O que mudou:** Removida a obrigação de registrar todo ajuste leve em `ajustes-operacionais.md` ou em comentário na issue #86.
**Por quê:** Reduzir burocracia documental e manter o arquivo focado em mudanças reais de processo.
**Impacto:** O commit passa a ser rastreabilidade suficiente para microajustes; este arquivo fica reservado para mudanças recorrentes de processo.

**Commit:** `a98ee0a`
**Tipo:** docs/proc
**O que mudou:** Documentada a regra de incluir `Entrega Visual Esperada` em issues de funcionalidade quando houver impacto visível na interface.
**Por quê:** Garantir que funções novas possam ser testadas pelo app, sem separar artificialmente visual mínimo de comportamento funcional.
**Impacto:** Issues de funcionalidade devem trazer o visual mínimo necessário para operar e validar o fluxo; refinamentos transversais continuam em issues visuais separadas.

## 2026-06-11

**Commit:** `77d1eae`  
**Tipo:** docs/proc  
**O que mudou:** Registrado padrão de issue fixa para ajustes contínuos em `docs/processos/fluxo-de-trabalho-github.md`.  
**Por quê:** Reduzir atrito de processo para mudanças leves de governança operacional que afetam fluxo de trabalho.  
**Impacto:** Mudanças pequenas de nomenclatura, padrão de commit, regras de organização podem ir direto na `main` sem PR de processo. Issue #86 é entrada de visibilidade.
