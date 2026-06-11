# ADR-005: Stack mínima da aplicação desktop para M1

## Status

Aceita para orientar a M1 - Ambiente.

## Contexto

A M1 precisa validar execução local de comandos Git e SVN com segurança, previsibilidade e mensagens úteis para a pessoa usuária.

Até aqui, o SVNFlow evitou decidir arquitetura completa da aplicação desktop. Esta decisão define uma base mínima para viabilizar implementação inicial sem antecipar escolhas de longo prazo.

## Decisão

Para a M1, a stack mínima será:

- `Electron` como contêiner desktop;
- `Node.js` no processo principal para integração com sistema operacional;
- `TypeScript` para tipagem e manutenção do código;
- interface inicial simples em HTML/CSS/TypeScript, sem decisão final de framework de UI.

Execução de comandos locais (Git/SVN):

- usar `node:child_process` no processo principal;
- executar comandos com diretório de trabalho explícito;
- capturar `stdout`, `stderr` e código de saída;
- aplicar timeout e tratamento de erro por operação sensível;
- expor ao renderer apenas APIs necessárias via preload seguro.

## Restrições de ambiente corporativo

Esta decisão considera uso em ambiente corporativo com possíveis bloqueios de software.

Premissas para Linux Mint Cinnamon em cenário empresarial:

- compatibilidade técnica com base Ubuntu/Debian não elimina bloqueios de política;
- pode haver restrição de instalação, execução de binários, atualização e rede;
- a operação deve depender do mínimo possível de privilégios administrativos.

Riscos operacionais a observar:

- bloqueio de execução de Electron/Node por política de segurança;
- bloqueio de processos filhos (`git`, `svn`) por EDR/antivírus corporativo;
- restrição de acesso a repositórios externos para download de dependências;
- limitação de atualização automática da aplicação em estações gerenciadas.

## Critérios de liberdade operacional mínima

Para manter viabilidade em ambiente corporativo, a implementação da M1 deve perseguir estes critérios:

- funcionar em modo local sem dependência obrigatória de serviços externos;
- suportar execução sem privilégio de administrador sempre que possível;
- não exigir auto-update para operação básica;
- realizar pré-validação de ambiente (Git, SVN, permissões e paths) antes do fluxo principal;
- manter logs e mensagens objetivas para facilitar homologação e suporte interno;
- prever fallback operacional por CLI para etapas críticas quando a interface desktop estiver bloqueada.

## Fora de escopo desta decisão

Ficam fora desta ADR:

- arquitetura completa da aplicação;
- empacotamento final e estratégia de distribuição;
- layout visual definitivo;
- decisão final de framework de interface;
- automações avançadas além da M1.

## Consequências

Benefícios imediatos:

- permite iniciar implementação da M1 com base técnica objetiva;
- viabiliza execução local de comandos com rastreabilidade de saída;
- reduz ambiguidade para tarefas de ambiente e integrações iniciais.

Riscos e limites:

- a stack de interface pode ser revisada em decisão futura;
- escolhas de arquitetura ampla continuam abertas para etapas posteriores;
- a M1 não deve usar esta ADR para justificar aumento de escopo fora do ambiente;
- a viabilidade em ambiente corporativo depende de homologação das políticas locais da organização.