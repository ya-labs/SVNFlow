# Plano do Protótipo Técnico da v1

## Objetivo

O protótipo técnico da v1 deve validar o fluxo principal do SVNFlow em um projeto fictício.

Ele não deve escolher stack final, arquitetura definitiva ou empacotamento desktop. O objetivo é provar o comportamento essencial antes dessas decisões.

## Escopo do protótipo

O protótipo deve validar:

- exportação de pacote `.svnflow`;
- geração de `pr.md`;
- geração de `manifest.json`;
- geração de `patch.diff`;
- importação do pacote;
- renderização do `pr.md`;
- aplicação do `patch.diff` em checkout SVN de teste;
- exibição de `svn status`;
- registro local simples de pacotes.

## Ambiente fictício

O protótipo deve usar apenas projeto fictício, sem código corporativo real.

O ambiente mínimo deve conter:

- um repositório Git de teste;
- uma branch de alteração;
- um checkout SVN de teste;
- arquivos simples de texto;
- pelo menos uma alteração modificando arquivo existente;
- pelo menos uma alteração criando arquivo novo.

Arquivos, nomes e mensagens devem ser genéricos.

## Fluxo a validar

Fluxo principal:

```text
Selecionar branch Git
↓
Exportar Alteração
↓
Gerar pacote .svnflow
↓
Importar Alteração
↓
Renderizar pr.md
↓
Aceitar
↓
Aplicar patch.diff no checkout SVN
↓
Mostrar svn status
↓
Registrar histórico local
```

## Critérios de sucesso

O protótipo é considerado válido quando:

- o pacote `.svnflow` é gerado com `pr.md`, `manifest.json` e `patch.diff`;
- o pacote pode ser importado;
- o `pr.md` é renderizado na prévia;
- o patch é aplicado em checkout SVN compatível;
- o `svn status` mostra as alterações esperadas;
- o histórico local registra pacote gerado, importado e aplicado.

## Falhas a observar

O protótipo deve registrar comportamento observado para:

- pacote inválido;
- pacote sem `pr.md`;
- pacote sem `patch.diff`;
- checkout SVN inexistente;
- checkout SVN sujo;
- patch que não encaixa no destino.

Essas falhas não precisam ter solução final no primeiro protótipo, mas precisam ficar visíveis.

## Fora do protótipo inicial

Ficam fora do protótipo inicial:

- stack final do app desktop;
- layout visual definitivo;
- empacotamento instalável;
- commit SVN automático;
- integração com servidor externo;
- suporte completo a arquivos binários;
- resolução automática de conflitos.

## Saída esperada

Ao final do protótipo, o projeto deve ter evidência suficiente para decidir:

- se o contrato `.svnflow` por patch é viável;
- quais validações são obrigatórias;
- quais falhas precisam de tratamento na v1;
- qual stack ou arquitetura faz sentido para implementar o app real.
