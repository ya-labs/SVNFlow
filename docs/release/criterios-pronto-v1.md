# Critérios de Pronto da V1

## Objetivo

Este documento define os critérios mínimos para considerar a V1 do SVNFlow pronta para implementação validada ou entrega experimental.

Ele serve para limitar o escopo, evitar crescimento indefinido e deixar claro o que precisa estar funcionando antes de tratar a V1 como concluída.

Este documento não substitui o acompanhamento de issues, milestones ou Project no GitHub.

## Definição de Pronto

A V1 estará pronta quando entregar um fluxo local, visual e seguro para preparar, revisar, transportar e aplicar alterações entre um workspace Git e um checkout SVN, mantendo o commit SVN como operação protegida.

## Checklist Geral

| Área | Critério | Obrigatório |
| --- | --- | --- |
| Ambiente | Detectar Git disponível localmente. | Sim |
| Ambiente | Detectar SVN disponível localmente. | Sim |
| Ambiente | Validar caminho de repositório Git. | Sim |
| Ambiente | Validar caminho de checkout SVN. | Sim |
| Ambiente | Salvar e selecionar ambientes locais. | Sim |
| Workspace Git | Detectar branch de origem. | Sim |
| Workspace Git | Permitir ou detectar base de comparação. | Sim |
| Workspace Git | Bloquear estados inseguros, como `detached HEAD`. | Sim |
| Preview | Listar arquivos criados, modificados e removidos. | Sim |
| Preview | Mostrar riscos ou limitações antes da exportação. | Sim |
| Pacote | Gerar pacote `.svnflow` válido. | Sim |
| Pacote | Incluir `manifest.json`, `pr.md` e `patch.diff`. | Sim |
| Pacote | Importar e validar pacote `.svnflow`. | Sim |
| Aplicação SVN | Validar checkout SVN antes de aplicar alteração. | Sim |
| Aplicação SVN | Aplicar `patch.diff` somente após confirmação explícita. | Sim |
| Aplicação SVN | Exibir `svn status` após aplicação. | Sim |
| Atualização SVN | Tratar `svn update` como operação sensível. | Sim |
| Commit SVN | Manter commit SVN separado da aplicação do patch. | Sim |
| Commit SVN | Exigir confirmação explícita antes de publicação. | Sim |
| Histórico local | Registrar eventos simples de pacotes exportados, importados e aplicados. | Sim |
| Interface | Usar o Design System da YA LABS como referência visual. | Sim |
| Segurança | Não enviar código para servidor externo. | Sim |
| Segurança | Não usar conteúdo corporativo real em exemplos ou testes públicos. | Sim |

## Critérios Mínimos de Funcionalidade

A V1 deve permitir:

- configurar ou selecionar workspace Git local;
- configurar ou selecionar checkout SVN local;
- salvar e selecionar um ambiente local com workspace Git e checkout SVN;
- validar os dois ambientes antes de operações sensíveis;
- gerar preview revisável de uma alteração Git;
- preencher ou renderizar uma mini PR local;
- gerar pacote `.svnflow`;
- importar pacote `.svnflow`;
- revisar `pr.md` antes de aplicar alteração;
- aplicar patch no checkout SVN validado;
- consultar `svn status`;
- registrar histórico local simples;
- conduzir o commit SVN como etapa protegida.

## Critérios de Segurança Operacional

A V1 deve bloquear ou exigir confirmação quando houver risco de alteração indevida.

Critérios mínimos:

- operações de leitura não devem alterar arquivos;
- geração de pacote deve acontecer somente após preview;
- aplicação de patch deve exigir checkout SVN válido;
- aplicação de patch deve exigir pacote válido;
- aplicação de patch deve exigir aceite explícito;
- `svn update` deve exigir confirmação explícita;
- commit SVN deve exigir confirmação reforçada;
- conflitos SVN devem bloquear avanço automático;
- falhas de patch não devem ser resolvidas automaticamente;
- o app não deve tentar descartar alterações locais sem confirmação forte.

## Critérios de Documentação

Antes de considerar a V1 pronta, devem existir documentos estáveis para:

- visão do produto;
- problema e público-alvo;
- definição da V1;
- requisitos da V1;
- fluxo principal;
- arquitetura conceitual;
- contratos operacionais;
- contrato de ambientes salvos;
- contrato do pacote `.svnflow`;
- contrato do `patch.diff`;
- contrato do `pr.md`;
- histórico local;
- ADRs aceitas;
- plano do protótipo navegável;
- critérios de pronto.

Esses documentos devem permanecer públicos, genéricos e sem conteúdo corporativo real.

## Critérios de Validação em Projeto Fictício

A V1 deve ser validada em ambiente fictício antes de qualquer uso real.

O ambiente de validação deve conter:

- repositório Git local fictício;
- branch de alteração fictícia;
- checkout SVN fictício;
- arquivos simples de texto;
- alteração de arquivo existente;
- criação de arquivo novo;
- remoção de arquivo simples;
- pacote `.svnflow` gerado localmente;
- importação do pacote;
- aplicação do patch em checkout SVN compatível;
- consulta de `svn status` após aplicação.

Falhas mínimas a observar:

- Git indisponível;
- SVN indisponível;
- caminho Git inválido;
- checkout SVN inválido;
- ambiente salvo inválido ou desatualizado;
- checkout SVN sujo;
- pacote inválido;
- pacote sem arquivo obrigatório;
- patch que não encaixa;
- conflito SVN;
- tentativa de commit sem mensagem.

## Critérios de Protótipo Navegável

O protótipo navegável deve demonstrar:

- jornada principal de ponta a ponta;
- telas ou áreas para exportação, importação, aplicação, histórico, atualização SVN e commit protegido;
- estados de sucesso, erro, bloqueio, aviso e confirmação;
- textos compreensíveis para pessoas que não dominam Git ou SVN em profundidade;
- separação clara entre aplicar alteração no checkout SVN e publicar commit no SVN;
- uso do Design System da YA LABS como referência visual.

## Riscos Aceitos na V1

A V1 aceita os seguintes riscos e limites:

- suporte incompleto a arquivos binários;
- suporte limitado a renomeações complexas;
- ausência de resolução automática de conflitos;
- ausência de sincronização completa com histórico SVN;
- histórico local sem valor de auditoria oficial;
- dependência de Git e SVN instalados localmente;
- fluxo inicialmente validado em ambiente fictício;
- experiência visual ainda sujeita a refinamento após protótipo.

Esses riscos devem ser visíveis para a pessoa usuária quando afetarem uma operação.

## Fora da V1

Ficam explicitamente fora da V1:

- substituir Git, SVN ou GitHub;
- criar servidor próprio de colaboração;
- hospedar código em serviço externo;
- implementar revisão completa de Pull Request;
- automatizar merge ou rebase avançado;
- resolver conflitos automaticamente;
- tornar `git svn` dependência obrigatória;
- criar auditoria oficial de alterações;
- sincronizar histórico entre máquinas;
- executar commit SVN automático após aplicar patch.

## Critérios Para Entrega Experimental

A entrega experimental da V1 pode acontecer quando:

- o checklist obrigatório estiver atendido;
- o fluxo principal funcionar em projeto fictício;
- as operações sensíveis estiverem protegidas;
- os riscos aceitos estiverem documentados;
- os principais bloqueios tiverem mensagens claras;
- não houver bug bloqueante conhecido no fluxo principal;
- o protótipo navegável tiver sido revisado;
- a documentação essencial estiver atualizada.

## Próximos Passos Após a V1

Depois da V1, o projeto pode avaliar:

- refinamento visual do app;
- suporte melhor a arquivos binários;
- suporte melhor a renomeações;
- uso opcional de `git svn`;
- integração com repositório Git autorizado;
- melhorias no histórico local;
- automações adicionais com confirmação forte;
- empacotamento desktop instalável;
- testes mais amplos em cenários controlados.

Esses itens não devem ser puxados para a V1 sem nova decisão.
