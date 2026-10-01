# Instalar o SVNFlow no Linux

O SVNFlow é um cliente SVN visual: faz checkout dos projetos do servidor, mostra as alterações com diff, commita só os arquivos escolhidos, exibe o histórico e atualiza o checkout. Opcionalmente, copia o último commit de um repositório Git para o SVN.

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

1. Abra o SVNFlow e clique em **Repositórios**. Em **Adicionar URL…**, informe a URL base do servidor SVN da sua equipe (por exemplo, `svn://servidor/caminho/projetos`). Ela fica salva só no seu computador.
2. Navegue até o projeto e clique em **Fazer checkout…**. Em projetos com `trunk/branches/tags`, o app sugere o checkout do `trunk`. O projeto é adicionado sozinho ao terminar.
3. Edite os arquivos no seu editor. Em **Alterações**, marque o que entra no commit, escreva a mensagem e clique em **Commit para o SVN**.
4. Em **Histórico**, veja os commits do servidor. Quando aparecer **Atualizar do servidor** na barra superior, há revisões novas para baixar.

Já tem um checkout? Use **Adicionar projeto…** no menu de projetos e escolha a pasta.

Se o servidor pedir usuário e senha, o app pergunta. O SVNFlow guarda a senha só enquanto estiver aberto. O próprio SVN pode lembrá-la, conforme a configuração da máquina.

Para quem trabalha no Git e publica no SVN: no menu do projeto, **Vincular Git…** liga um repositório Git ao checkout. A aba Alterações passa a copiar o último commit da branch atual para o SVN antes do commit.

## Avisos

- Só entra o que está commitado no Git. Alterações não commitadas ficam de fora.
- O Git é a fonte da verdade: arquivos que existem só no checkout SVN são removidos, e edições feitas direto no checkout são sobrescritas.
- O app não roda `svn update`. Se outras pessoas também commitam no SVN, atualize o checkout antes de sincronizar.
- Configurações e histórico ficam em `~/.svnflow/`.
