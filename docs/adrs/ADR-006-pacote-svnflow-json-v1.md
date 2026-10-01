# ADR-006: Pacote `.svnflow` como arquivo JSON único na V1

## Status

Aceita. Substitui a decisão de formato de arquivo (ZIP renomeado) da [ADR-002](ADR-002-contrato-pacote-svnflow.md). O restante da ADR-002 continua válido.

## Contexto

A ADR-002 definiu o `.svnflow` como um ZIP renomeado contendo `pr.md`, `manifest.json`, `patch.diff` e uma pasta `files/` reservada.

A implementação da V1 passou a gravar o pacote como um único arquivo JSON, com `manifest` e `artifacts`, porque:

- a stack mínima da ADR-005 não inclui biblioteca de compressão, e gerar ZIP exigiria uma dependência nova;
- o pacote da V1 transporta apenas texto (`pr.md`, `patch.diff` e metadados), e o patch binário do Git já vem codificado em texto;
- um JSON único é fácil de validar por checksum e de inspecionar em qualquer editor.

A primeira versão do formato (`1.0.0`) não incluía o `patch.diff`, o que impedia aplicar um pacote importado.

## Decisão

Na V1, o `.svnflow` é um arquivo JSON UTF-8 com esta estrutura:

```text
{
  "manifest": { formatVersion, packageId, generatedAt, author, checksumAlgorithm, checksum, requiredFields, artifacts },
  "artifacts": {
    "preview.json": dados técnicos do preview,
    "pr.md": mini PR gerada a partir dos campos estruturados,
    "patch.diff": patch gerado por git diff --binary --no-renames base...HEAD,
    "mini-pr.json": campos humanos da mini PR
  }
}
```

Regras:

- o formato atual é `1.1.0`, e `patch.diff` é obrigatório nele;
- o checksum SHA-256 cobre todos os artefatos, serializados de forma estável;
- a importação continua aceitando `1.0.0`, apenas para revisão, sem permitir aplicação;
- o `manifest` cumpre o papel do `manifest.json` da ADR-002;
- a pasta `files/` continua fora da V1.

## Consequências

- O pacote não depende de biblioteca de compressão.
- Pacotes grandes ficam maiores do que ficariam em ZIP. Para as alterações de texto da V1, esse custo é aceitável.
- Se a V2 precisar de arquivos binários fora do patch ou de compressão, o formato deve mudar de versão, e a importação deve manter a leitura das versões anteriores.
