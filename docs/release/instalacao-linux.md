# Instalar o SVNFlow no Linux

O SVNFlow deixa um checkout SVN igual ao último commit de um repositório Git e publica a alteração com um commit SVN.

## Qual arquivo baixar

Na página de Releases do repositório, baixe um dos arquivos:

| Arquivo | Para quem |
| --- | --- |
| `SVNFlow-<versão>-amd64.deb` | Ubuntu, Linux Mint, Debian e derivados, quando você tem `sudo`. |
| `SVNFlow-<versão>-x86_64.AppImage` | Qualquer distribuição, sem instalar e **sem sudo**. Use em computadores de empresa. |

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

## Usar o AppImage (sem sudo)

O AppImage roda direto da pasta pessoal, sem instalação e sem permissão de administrador. Use esta opção em computadores sem `sudo`, como os de empresa.

```bash
cd ~/Downloads
chmod +x SVNFlow-*-x86_64.AppImage
./SVNFlow-*-x86_64.AppImage
```

O app precisa do Git e do SVN de linha de comando. Confira se estão disponíveis:

```bash
git --version
svn --version --quiet
```

Se algum faltar, instale com `sudo apt install git subversion` ou peça ao suporte de TI.

### Atalho no menu de aplicativos (sem sudo)

Os comandos abaixo guardam o AppImage em `~/.local/opt/svnflow` e criam um atalho com ícone só para o seu usuário:

```bash
mkdir -p ~/.local/opt/svnflow ~/.local/share/applications ~/.local/share/icons/hicolor/512x512/apps
mv ~/Downloads/SVNFlow-*-x86_64.AppImage ~/.local/opt/svnflow/SVNFlow.AppImage
chmod +x ~/.local/opt/svnflow/SVNFlow.AppImage
cd /tmp && ~/.local/opt/svnflow/SVNFlow.AppImage --appimage-extract usr/share/icons/hicolor/512x512/apps/svnflow.png >/dev/null \
  && cp squashfs-root/usr/share/icons/hicolor/512x512/apps/svnflow.png ~/.local/share/icons/hicolor/512x512/apps/ \
  && rm -rf squashfs-root
cat > ~/.local/share/applications/svnflow.desktop <<EOF
[Desktop Entry]
Name=SVNFlow
Exec=$HOME/.local/opt/svnflow/SVNFlow.AppImage %U
Icon=$HOME/.local/share/icons/hicolor/512x512/apps/svnflow.png
Type=Application
Categories=Development;
StartupWMClass=svnflow
EOF
```

O SVNFlow passa a aparecer no menu. O ícone é indicado pelo caminho completo para aparecer na hora, sem depender do cache de ícones do sistema.

- **Atualizar:** substitua `~/.local/opt/svnflow/SVNFlow.AppImage` pelo arquivo da versão nova e rode `chmod +x` de novo.
- **Remover:** apague `~/.local/opt/svnflow`, `~/.local/share/applications/svnflow.desktop` e `~/.local/share/icons/hicolor/512x512/apps/svnflow.png`.

### Se o AppImage não abrir

Se aparecer um erro sobre **FUSE** ou `libfuse.so.2` (comum no Ubuntu 22.04+ e no Mint 21+), rode sem FUSE. Também não precisa de sudo:

```bash
./SVNFlow-*-x86_64.AppImage --appimage-extract-and-run
```

No atalho, troque a linha `Exec=` por `Exec=<sua pasta pessoal>/.local/opt/svnflow/SVNFlow.AppImage --appimage-extract-and-run %U`. Quem tem sudo também pode resolver com `sudo apt install libfuse2`.

Não é preciso passar `--no-sandbox`: o AppImage desativa o sandbox do Chromium sozinho quando o sistema não permite usá-lo (comum no Ubuntu 24.04+).

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
