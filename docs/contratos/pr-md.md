# Contrato do `pr.md`

## Objetivo

Este documento define o papel do `pr.md` dentro do pacote `.svnflow`.

O `pr.md` é a descrição humana da alteração. Ele funciona como uma mini PR local transportável, mas não substitui Pull Request do GitHub.

## Origem

O `pr.md` deve ser gerado a partir de campos estruturados preenchidos na etapa Pacotes.

O Preview fornece dados técnicos para esses campos, mas não deve ser a tela principal de preenchimento da mini PR.

Campos humanos preenchidos ou confirmados na etapa Pacotes:

- título;
- contexto;
- o que mudou;
- observações.

Campos técnicos reaproveitados do Preview validado:

- branch de origem;
- base de comparação;
- arquivos alterados.

Campos operacionais detectados ou informados pelo app:

- autor;
- data de exportação;
- versão do formato;
- identificador do pacote.

## Uso

O `pr.md` deve ser:

- incluído dentro do pacote `.svnflow`;
- renderizado na importação;
- renderizado ao abrir um item do histórico local;
- usado para facilitar revisão humana antes da aplicação.

Na interface, revisar o `pr.md` não deve ser confundido com aplicar a alteração no checkout SVN. A revisão é leitura; a aplicação é uma operação separada e sensível.

## Fallbacks

Campos opcionais ausentes devem ser renderizados como não informados.

Campos obrigatórios ausentes devem ser tratados como erro de validação do pacote antes da revisão.

A tela de revisão pode usar dados do `manifest.json` como apoio quando o `pr.md` estiver incompleto, desde que deixe claro que o pacote possui informação ausente.

## Limites

Na V1, o `pr.md` não deve ser editado manualmente como fonte principal do fluxo.

O app deve gerar o Markdown a partir de campos estruturados para reduzir inconsistência e facilitar validação.

O `pr.md` não deve ser usado como fonte única de metadados técnicos. Dados como branch, base, arquivos e checksum pertencem ao contrato do pacote e ao `manifest.json`.
