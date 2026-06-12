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

A V1 deve caminhar para uma aplicação desktop com:

- shell principal visível;
- navegação entre etapas do fluxo;
- área de contexto do ambiente ativo;
- área principal da etapa atual;
- mensagens de bloqueio, atenção, sucesso e erro;
- ações primárias e secundárias claramente diferenciadas;
- confirmações explícitas antes de operações sensíveis.

O shell visual deve permitir que a pessoa usuária entenda onde está no fluxo e qual será o próximo passo seguro.

## Responsividade e Redimensionamento

A janela do SVNFlow deve ser redimensionável em largura e altura.

A altura mínima de referência da V1 é `520px`. A interface deve continuar utilizável próxima desse limite, sem depender de maximização da janela.

O container principal deve ocupar a viewport inteira. A aplicação não deve usar scroll global da página como solução padrão para telas pequenas.

Quando faltar espaço, o layout deve se adaptar por:

- redução controlada de espaçamentos;
- grids e containers que encolhem corretamente;
- quebra ou tratamento visual de textos longos;
- scroll apenas em regiões específicas e previsíveis.

Na V1, a lista de etapas pode ter scroll vertical quando a altura da janela for pequena. Topo, área principal e contexto do ambiente devem continuar visíveis.

## Navegação Principal

A navegação da V1 deve representar as principais etapas do SVNFlow:

- Ambiente;
- Workspace Git;
- Preview;
- Aplicação SVN;
- Commit SVN protegido;
- Pacotes SVNFlow;
- Histórico local.

Etapas que dependem de validação anterior devem aparecer bloqueadas ou indisponíveis até que as pré-condições sejam atendidas.

A navegação deve funcionar tanto para trabalho solo quanto para colaboração por pacote `.svnflow`, sem transformar a V1 em uma plataforma colaborativa completa.

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

O SVNFlow deve usar o Design System da YA LABS como referência visual.

Isso significa buscar consistência com padrões visuais, hierarquia, espaçamento, linguagem e componentes definidos no YABook quando aplicável.

Esta diretriz não cria um design system novo para o SVNFlow. Também não exige que a V1 defina tokens finais, biblioteca definitiva de componentes ou layout final antes da implementação visual inicial.

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
