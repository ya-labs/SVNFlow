# Público-Alvo

## Público principal

Pessoas desenvolvedoras que trabalham em ambientes onde o SVN continua sendo o repositório oficial, mas desejam usar Git localmente para organizar alterações antes da publicação.

## Cenário típico

O cenário esperado envolve:

- projeto oficial versionado em SVN;
- pessoa desenvolvedora usando Git local para organizar branches e alterações;
- necessidade de revisar arquivos antes de aplicar no checkout SVN;
- risco de erro humano em operações manuais;
- colaboração entre pessoas sem transformar o Git em repositório oficial.

## Necessidades

O público precisa:

- entender o estado do Git e do SVN antes de agir;
- visualizar o que será levado ao SVN;
- aplicar alterações com validação;
- evitar commit SVN acidental;
- transportar uma alteração revisável para outra pessoa;
- manter o fluxo local, simples e seguro.

## Fora do público principal da v1

A v1 não foca em:

- substituir plataformas de Pull Request;
- criar colaboração completa equivalente ao GitHub;
- operar como servidor central;
- resolver todos os cenários avançados de `git svn`.

