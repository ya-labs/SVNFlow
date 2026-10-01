# ADR-007: Sincronização por espelhamento como fluxo principal

## Status

Aceita. Muda o fluxo principal definido no [fluxo principal da V1](../fluxos/fluxo-principal.md). O fluxo por patch e pacotes `.svnflow` continua disponível como modo avançado.

## Contexto

No uso real, o desenvolvimento acontece todo no GitHub: issues, branches, Pull Requests e merge. O SVN precisa receber o mesmo código, mas não participa da revisão.

A prática manual era manter um checkout SVN em outra pasta, copiar todos os arquivos do repositório Git para ele e commitar.

O fluxo por patch (`base...HEAD` aplicado no checkout) não atende bem esse caso:

- exige que o checkout SVN esteja exatamente na base de comparação;
- falha quando o checkout está atrasado ou adiantado em relação à base;
- adiciona etapas (preview, mini PR, pacote) que não têm uso quando a revisão já acontece no GitHub.

## Decisão

O fluxo principal do SVNFlow passa a ser **Sincronizar**:

1. ler o último commit (`HEAD`) do repositório Git, apenas arquivos versionados;
2. comparar com o checkout SVN pelo hash de blob do Git;
3. mostrar o que será criado, atualizado e removido;
4. após confirmação, gravar os arquivos e agendar `svn add`/`svn delete`;
5. sugerir a mensagem do commit SVN a partir dos commits Git desde a última sincronização publicada;
6. após confirmação, fazer um commit SVN por sincronização, com a mensagem editável.

Regras:

- alterações não commitadas no Git não entram;
- arquivos e pastas versionados no SVN que não existem no Git são removidos;
- itens não versionados no checkout que não existem no Git são mantidos e não entram no commit;
- conflitos no checkout bloqueiam a sincronização;
- links simbólicos e submódulos não são copiados;
- o último commit Git publicado fica gravado no ambiente salvo.

Workspace Git, Preview, Pacotes, Aplicação SVN e Commit SVN avulso ficam ocultos atrás de "Modo avançado".

## Consequências

- O checkout SVN fica igual ao Git independentemente do estado anterior, sem depender de base de comparação.
- O histórico do SVN agrupa vários commits Git num commit só. A mensagem lista os commits incluídos.
- Arquivos que existem só no SVN e estão versionados são removidos na sincronização. Quem precisar mantê-los deve versioná-los também no Git.
- O SVN deixa de ser lugar de edição: alterações feitas direto no checkout são sobrescritas na próxima sincronização.
