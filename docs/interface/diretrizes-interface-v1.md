# Diretrizes da Interface Visual da V1

## Objetivo

Definir as diretrizes de interface visual da V1 do SVNFlow.

Este documento existe para evitar ambiguidade entre entregar dados para a interface e entregar uma interface realmente renderizada. Ele deve orientar pessoas desenvolvedoras e assistentes de IA ao criar issues, implementar telas e validar entregas relacionadas à experiência visual.

## Papel da Interface na V1

A interface da V1 deve tornar o fluxo Git + SVN mais claro, seguro e guiado.

Ela deve ajudar a pessoa usuária a:

- entender qual ambiente local está ativo;
- revisar arquivos antes de qualquer alteração no checkout SVN;
- identificar bloqueios, riscos e próximos ajustes necessários;
- confirmar explicitamente operações sensíveis;
- diferenciar preparação local de publicação no SVN.

A interface não deve esconder riscos operacionais. Sempre que uma operação puder alterar arquivos locais ou publicar alteração no SVN, a tela deve deixar isso claro antes da ação.

## Diferença Entre Contrato, Renderização e Integração

### Contrato ou estado para interface

Contrato ou estado para interface é a camada que prepara dados para uma tela.

Exemplos:

- tipos;
- modelos;
- adapters;
- objetos de estado;
- mensagens candidatas;
- funções que retornam dados para renderização;
- mapeamento de bloqueios, erros e sucessos.

Essa entrega é útil, mas não é uma interface renderizada.

Quando uma issue entregar apenas contrato ou estado para interface, isso deve estar claro no título ou no escopo. A label pode ser `architecture`, `backend` ou `full-stack`, conforme a área afetada.

### Interface renderizada

Interface renderizada é algo visível que a pessoa usuária consegue abrir, inspecionar e usar.

Exemplos:

- tela;
- shell visual;
- navegação;
- componente visual;
- botão;
- formulário;
- lista;
- painel de status;
- mensagem exibida na aplicação.

Quando uma issue `frontend` mencionar `tela`, `shell`, `renderer`, `navegação` ou `componente visual`, a entrega só deve ser considerada concluída se existir algo visível na aplicação ou protótipo correspondente.

### Integração entre renderer e regras internas

Integração é a camada que conecta a interface renderizada aos contratos, estados e regras internas já existentes.

Exemplos:

- uma tela de ambiente consumindo o estado validado do ambiente;
- uma tela de preview exibindo os arquivos calculados pelo módulo de preview;
- uma confirmação visual consumindo o resultado de aplicação no checkout SVN.

Quando a issue exigir interface e regras internas na mesma entrega, use `full-stack`.

## Estrutura Visual Esperada

O layout principal segue o padrão de clientes Git desktop, com o GitHub Desktop como referência:

- barra superior escura com o projeto atual (menu para trocar, adicionar, vincular Git ou remover), a branch e o commit Git (menu para trocar de branch, com filtro, branches locais e remotas) e um botão contextual: verificar alterações, ou **Atualizar do servidor** quando há revisões novas;
- tela **Repositórios** com servidores SVN salvos, navegação por breadcrumb, busca na pasta ou no histórico, histórico remoto e checkout com progresso;
- barra lateral com as abas *Alterações* e *Histórico*;
- lista de arquivos com caixa de seleção para o commit e ícone de status: criado (`+`), modificado (`•`), removido (`−`) ou em conflito (`!`);
- menu de clique direito em cada arquivo (ou Shift+F10): descartar mudanças, abrir no VS Code, mostrar na pasta, `svn:ignore` para itens novos e *Ignorar no commit* (changelist `ignore-on-commit`, como no TortoiseSVN) para itens versionados; botão *Descartar* no topo da lista para os arquivos marcados;
- descartar mudanças sempre manda uma cópia do conteúdo atual para a Lixeira do sistema antes de reverter;
- caixa de commit no rodapé da barra lateral, com resumo e descrição editáveis;
- painel de detalhe com o diff do arquivo selecionado, numeração de linhas e cores de adição e remoção;
- barra de status com a última mensagem do app;
- modais para adicionar projeto, fazer checkout, entrar no servidor e confirmar operações sensíveis;
- tema claro e escuro, escolhido em *Aparência* (Sistema, Claro ou Escuro). O padrão segue o sistema.

Operações sensíveis (atualizar o checkout SVN e publicar commit) sempre passam por um modal de confirmação que descreve o efeito.

A troca de branch acontece direto pelo menu, como no GitHub Desktop, mas é bloqueada quando há alterações não commitadas em arquivos versionados. Assim nada é levado de uma branch para outra sem querer.

O fluxo por patch e pacotes `.svnflow` fica em *Modo avançado*, com navegação própria por etapas.

## Responsividade e Redimensionamento

A janela do SVNFlow deve ser redimensionável em largura e altura.

A altura mínima de referência da V1 é `520px`. A interface deve continuar utilizável próxima desse limite, sem depender de maximização da janela.

O container principal deve ocupar a viewport inteira. A aplicação não deve usar scroll global da página como solução padrão para telas pequenas.

Quando faltar espaço, o layout deve se adaptar por:

- redução controlada de espaçamentos;
- grids e containers que encolhem corretamente;
- quebra ou tratamento visual de textos longos;
- scroll apenas em regiões específicas e previsíveis.

A lista de arquivos, o diff e a lista de etapas do modo avançado têm scroll próprio. A barra superior, a caixa de commit e a barra de status continuam visíveis.

## Navegação Principal

A visão principal tem duas abas ([ADR-008](../adrs/ADR-008-cliente-svn-com-git-opcional.md)):

- *Alterações*: o `svn status` do checkout, com seleção do que entra no commit. Em projeto com Git vinculado e diferenças, vem antes o passo de copiar o último commit do Git ([ADR-007](../adrs/ADR-007-sincronizacao-por-espelhamento.md));
- *Histórico*: o `svn log` do servidor, com as revisões que o checkout ainda não tem marcadas como novas e o diff por arquivo.

A tela *Repositórios* fica num botão da barra superior.

O *Modo avançado* mantém as etapas da V1 por patch e pacote:

- Ambiente;
- Workspace Git;
- Preview;
- Pacotes SVNFlow;
- Aplicação SVN;
- Commit SVN protegido;
- Histórico local.

## Estados Visuais Obrigatórios

As telas da V1 devem distinguir visualmente:

- `pronto`: a etapa pode avançar;
- `atenção`: existe algo que precisa ser revisado;
- `bloqueado`: a etapa não pode avançar;
- `erro`: uma operação falhou ou uma ferramenta não está disponível;
- `sucesso`: uma operação foi concluída;
- `pendente`: há informação incompleta ou aguardando validação.

Esses estados devem aparecer de forma compreensível para a pessoa usuária, não apenas como valores internos no código.

## Critério Para Issues Frontend

Issues com label `frontend` devem deixar explícito se a entrega esperada é:

- documentação visual;
- protótipo;
- contrato ou estado para interface;
- interface renderizada;
- integração entre renderer e regras internas.

Quando a issue pedir interface renderizada, os critérios de aceite devem mencionar pelo menos:

- qual tela, área, shell, navegação ou componente deve aparecer;
- como a pessoa usuária consegue visualizar a entrega;
- quais estados mínimos devem ser exibidos;
- o que não faz parte da entrega.

Se a entrega não renderizar nada, a issue não deve ser descrita como implementação de tela, shell, renderer, navegação ou componente visual.

## Uso do Design System da YA LABS

O Design System da YA LABS continua como referência de linguagem, textos, hierarquia e estados visuais.

A referência de layout e de componentes passou a ser o GitHub Desktop, por decisão de produto: o público do SVNFlow já usa clientes Git desktop, e o padrão reduz o aprendizado. Tokens de cor, tipografia e espaçamento ficam definidos em `src/renderer/styles.css`, com variantes clara e escura.

Esta diretriz não cria um design system novo para o SVNFlow.

## Fora de Escopo

Este documento não define:

- stack de frontend;
- framework de UI;
- arquitetura do renderer;
- componentes finais;
- tokens de cor;
- tipografia definitiva;
- layout final de todas as telas;
- implementação de Electron, Vite, React ou qualquer tecnologia específica.

## Referências Relacionadas

- [Plano do protótipo navegável da V1](../prototipos/plano-prototipo-v1.md)
- [Tela de Ambiente: Planejamento do Protótipo](../prototipos/tela-ambiente-prototipo.md)
- [Requisitos da V1](../requisitos/requisitos-v1.md)
- [Fluxo principal da V1](../fluxos/fluxo-principal.md)
- [Critérios de pronto da V1](../release/criterios-pronto-v1.md)
