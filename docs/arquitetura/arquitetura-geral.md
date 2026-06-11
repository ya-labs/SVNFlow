# Arquitetura Geral

## Objetivo

Este documento descreve a arquitetura conceitual do SVNFlow sem definir stack, framework ou implementação final.

## Visão geral

O SVNFlow deve ser um aplicativo desktop local que coordena operações entre:

- um workspace Git usado para organizar alterações;
- um checkout SVN usado como destino oficial de publicação;
- pacotes `.svnflow` usados para transportar alterações revisáveis;
- histórico local simples usado apenas como apoio da aplicação.

## Módulos conceituais

| Módulo | Responsabilidade |
| --- | --- |
| Ambiente | Detectar Git, SVN, caminhos locais e estados mínimos. |
| Workspace Git | Ler branch, base de comparação, arquivos alterados e gerar `patch.diff`. |
| Preview | Mostrar arquivos afetados, metadados e resumo antes de aplicar mudanças. |
| Pacotes SVNFlow | Exportar, importar e validar arquivos `.svnflow`. |
| Aplicação SVN | Validar checkout SVN e aplicar alterações de forma controlada. |
| Commit SVN | Proteger publicação oficial com confirmação explícita. |
| Histórico local | Registrar metadados simples de pacotes exportados e importados. |

## Comunicação entre módulos

```text
Workspace Git
  -> Preview
  -> Pacote .svnflow
  -> Importação
  -> Aplicação SVN
  -> svn status
  -> Commit SVN protegido
```

## Armazenamento

A v1 deve evitar armazenamento complexo.

O histórico local pode guardar metadados e referências para pacotes locais, sem duplicar conteúdo sensível e sem virar auditoria oficial.

## Formato do pacote

O pacote `.svnflow` é um ZIP renomeado contendo, no mínimo:

- `manifest.json`;
- `pr.md`;
- `patch.diff`;
- pasta `files/` reservada para cenários futuros.

O contrato detalhado fica em [pacote-svnflow.md](../contratos/pacote-svnflow.md).

