# Ajustes Operacionais

Registro versionado de ajustes contínuos leves de processo, nomenclatura, organização e fluxo de trabalho.

Cada ajuste é aplicado direto na `main` e registrado aqui com referência ao commit.

---

## 2026-06-12

**Commit:** neste commit na `main`
**Tipo:** docs/proc
**O que mudou:** Documentada a regra de incluir `Entrega Visual Esperada` em issues de funcionalidade quando houver impacto visível na interface.
**Por quê:** Garantir que funções novas possam ser testadas pelo app, sem separar artificialmente visual mínimo de comportamento funcional.
**Impacto:** Issues de funcionalidade devem trazer o visual mínimo necessário para operar e validar o fluxo; refinamentos transversais continuam em issues visuais separadas.

**Commit:** neste commit na `main`
**Tipo:** fullstack/proc
**O que mudou:** Ajustada a configuração da janela Electron para garantir a exposição das APIs de preload usadas nas telas Ambiente e Preview.
**Por quê:** A interface exibia `Falha ao carregar integração de ambiente` e `Falha ao carregar integração de preview`, mesmo com build e testes passando.
**Impacto:** A aplicação volta a carregar os estados funcionais das etapas iniciais; quando não há cadastro local, a tela passa a mostrar corretamente `Nenhum ambiente salvo encontrado.` em vez de erro de integração.

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
