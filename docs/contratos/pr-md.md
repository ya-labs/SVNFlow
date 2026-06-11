# Contrato do `pr.md`

## Objetivo

Este documento define o papel do `pr.md` dentro do pacote `.svnflow`.

O `pr.md` é a descrição humana da alteração. Ele funciona como uma mini PR local transportável, mas não substitui Pull Request do GitHub.

## Origem

O `pr.md` deve ser gerado a partir de campos estruturados da exportação:

- título;
- contexto;
- o que mudou;
- observações;
- branch de origem;
- base de comparação;
- autor;
- arquivos alterados.

## Uso

O `pr.md` deve ser:

- incluído dentro do pacote `.svnflow`;
- renderizado na importação;
- renderizado ao abrir um item do histórico local;
- usado para facilitar revisão humana antes da aplicação.

## Limites

Na V1, o `pr.md` não deve ser editado manualmente como fonte principal do fluxo.

O app deve gerar o Markdown a partir de campos estruturados para reduzir inconsistência e facilitar validação.

