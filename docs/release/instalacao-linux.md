# Instalar o SVNFlow no Linux

O SVNFlow deixa um checkout SVN igual ao último commit de um repositório Git e publica a alteração com um commit SVN.

## Qual arquivo baixar

Na página de Releases do repositório, baixe um dos arquivos:

| Arquivo | Para quem |
| --- | --- |
| `SVNFlow-<versão>-amd64.deb` | Ubuntu, Linux Mint, Debian e derivados. **Recomendado.** |
| `SVNFlow-<versão>-x86_64.AppImage` | Qualquer distribuição, sem instalar. |

## Instalar o `.deb`

Dê dois cliques no arquivo e confirme a instalação, ou rode no terminal:

```bash
sudo apt install ./SVNFlow-*-amd64.deb
```

O `git` e o `subversion` são instalados junto, se ainda não estiverem. O SVNFlow aparece no menu de aplicativos.

Para remover:

```bash
sudo apt remove svnflow
```

## Usar o AppImage

```bash
chmod +x SVNFlow-*-x86_64.AppImage
./SVNFlow-*-x86_64.AppImage
```

Com o AppImage, instale o Git e o SVN você mesmo:

```bash
sudo apt install git subversion
```

Se o AppImage não abrir:

- **Erro sobre FUSE** (comum no Ubuntu 22.04+ e no Mint 21+): instale `sudo apt install libfuse2`.
- **Erro sobre sandbox** (comum no Ubuntu 24.04+): rode `./SVNFlow-*-x86_64.AppImage --no-sandbox`.

## Primeiro uso

1. Faça o checkout SVN uma vez numa pasta separada, por exemplo:

   ```bash
   svn checkout <url-do-repositório-svn> ~/svn/meu-projeto
   ```

2. Abra o SVNFlow e clique em **Adicionar ambiente**. Escolha a pasta do repositório Git e a pasta do checkout SVN.
3. Em **Alterações**, revise o que difere do último commit do Git e clique em **Copiar para o SVN**.
4. Revise ou edite a mensagem e clique em **Commit para o SVN**.

O app usa as credenciais SVN já salvas no seu computador. Se o servidor pedir senha, faça um `svn update` no checkout pelo terminal uma vez para salvá-la.

## Avisos

- Só entra o que está commitado no Git. Alterações não commitadas ficam de fora.
- O Git é a fonte da verdade: arquivos que existem só no checkout SVN são removidos, e edições feitas direto no checkout são sobrescritas.
- O app não roda `svn update`. Se outras pessoas também commitam no SVN, atualize o checkout antes de sincronizar.
- Configurações e histórico ficam em `~/.svnflow/`.
