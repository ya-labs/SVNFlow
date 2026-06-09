# Decisão 0002: Contrato inicial do pacote `.svnflow`

## Status

Aceita para orientar a v1.

## Contexto

A v1 do SVNFlow precisa transportar alterações entre pessoas sem depender de GitHub pessoal, servidor Git compartilhado ou hospedagem externa para código corporativo.

O pacote `.svnflow` já foi escolhido como formato de colaboração local. Faltava definir o contrato inicial do pacote para orientar exportação, importação, validação e aplicação no checkout SVN.

## Decisão

O pacote `.svnflow` será um arquivo ZIP renomeado.

Na v1, ele deve transportar a alteração técnica principalmente por patch.

Estrutura inicial:

```text
5647-bug001.svnflow
|-- pr.md
|-- manifest.json
|-- patch.diff
`-- files/
```

Responsabilidades dos arquivos:

- `pr.md`: descrição humana da alteração, gerada a partir dos campos estruturados da mini PR local;
- `manifest.json`: metadados usados pelo app para validar, listar e importar o pacote;
- `patch.diff`: alteração técnica aplicável no checkout SVN;
- `files/`: pasta reservada para casos futuros, como arquivos binários ou cenários em que patch não for suficiente.

## Aplicação da alteração

A pessoa usuária não deve aplicar mudanças manualmente.

O SVNFlow deve:

- gerar o `patch.diff` durante a exportação;
- incluir o patch dentro do pacote `.svnflow`;
- validar o pacote durante a importação;
- aplicar o patch no checkout SVN somente após aceite explícito;
- bloquear a aplicação quando o patch não encaixar no destino;
- mostrar o `svn status` após aplicação bem-sucedida.

## Fora da v1

Ficam fora do contrato inicial:

- uso obrigatório da pasta `files/`;
- empacotamento de cópia completa de todos os arquivos alterados;
- sincronização com histórico SVN;
- resolução automática de conflitos;
- commit SVN automático.

## Consequências

Essa decisão mantém o pacote simples, revisável e compatível com um fluxo seguro.

O patch permite mostrar exatamente o que mudou e validar se a alteração encaixa no checkout SVN antes de modificar arquivos. Se o patch falhar, o SVNFlow deve parar o fluxo e informar a falha sem sobrescrever arquivos automaticamente.

Arquivos binários e cenários em que patch não for suficiente devem ser tratados como pontos de validação futura, sem bloquear a v1.
