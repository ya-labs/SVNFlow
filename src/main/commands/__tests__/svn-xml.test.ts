import { decodeXml, parseInfoXml, parseListXml, parseLogXml, parseStatusXml } from '../svn-xml';

describe('svn-xml', () => {
  it('decodifica entidades, inclusive numéricas', () => {
    expect(decodeXml('a &amp; b &lt;c&gt; &quot;d&quot; &#233;')).toBe('a & b <c> "d" é');
  });

  it('lê status com caminhos acentuados e itens variados', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<status><target path=".">
<entry path="relatório final.txt"><wc-status props="none" item="modified" revision="3"></wc-status></entry>
<entry path="novo &amp; teste.js"><wc-status props="none" item="unversioned"></wc-status></entry>
<entry path="src/sumiu.ts"><wc-status props="none" item="missing" revision="3"></wc-status></entry>
</target></status>`;

    expect(parseStatusXml(xml)).toEqual([
      { path: 'relatório final.txt', item: 'modified', props: 'none', revision: '3' },
      { path: 'novo & teste.js', item: 'unversioned', props: 'none', revision: undefined },
      { path: 'src/sumiu.ts', item: 'missing', props: 'none', revision: '3' }
    ]);
  });

  it('lê log com mensagem de várias linhas, cópia e caminhos', () => {
    const xml = `<log>
<logentry revision="12"><author>pessoa</author><date>2026-10-01T12:00:00.000000Z</date>
<paths>
<path text-mods="true" kind="file" action="M" prop-mods="false">/trunk/app.js</path>
<path kind="dir" action="A" copyfrom-path="/trunk" copyfrom-rev="11">/branches/v2</path>
</paths>
<msg>Corrige &lt;bug&gt;

Detalhe na segunda linha.</msg></logentry>
<logentry revision="11"><author>outra</author><date>2026-09-30T10:00:00.000000Z</date><msg></msg></logentry>
</log>`;

    const entries = parseLogXml(xml);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      revision: '12',
      author: 'pessoa',
      date: '2026-10-01T12:00:00.000000Z',
      message: 'Corrige <bug>\n\nDetalhe na segunda linha.',
      paths: [
        { action: 'M', kind: 'file', path: '/trunk/app.js', copyFromPath: undefined, copyFromRevision: undefined },
        { action: 'A', kind: 'dir', path: '/branches/v2', copyFromPath: '/trunk', copyFromRevision: '11' }
      ]
    });
    expect(entries[1]).toMatchObject({ revision: '11', message: '', paths: [] });
  });

  it('lê listagem remota', () => {
    const xml = `<lists><list path="svn://servidor/raiz">
<entry kind="dir"><name>projeto-a</name><commit revision="40"><author>pessoa</author><date>2026-09-01T00:00:00Z</date></commit></entry>
<entry kind="file"><name>LEIA-ME.txt</name><size>120</size><commit revision="2"><author>outra</author><date>2026-01-01T00:00:00Z</date></commit></entry>
</list></lists>`;

    expect(parseListXml(xml)).toEqual([
      { name: 'projeto-a', kind: 'dir', size: undefined, revision: '40', author: 'pessoa', date: '2026-09-01T00:00:00Z' },
      { name: 'LEIA-ME.txt', kind: 'file', size: 120, revision: '2', author: 'outra', date: '2026-01-01T00:00:00Z' }
    ]);
  });

  it('lê info de checkout', () => {
    const xml = `<info><entry kind="dir" path="." revision="7">
<url>svn://servidor/raiz/projeto/trunk</url>
<repository><root>svn://servidor/raiz</root></repository>
<wc-info><wcroot-abspath>/home/pessoa/svn/projeto</wcroot-abspath></wc-info>
<commit revision="6"><author>pessoa</author></commit>
</entry></info>`;

    expect(parseInfoXml(xml)).toEqual({
      url: 'svn://servidor/raiz/projeto/trunk',
      repositoryRoot: 'svn://servidor/raiz',
      workingCopyRoot: '/home/pessoa/svn/projeto',
      revision: '7',
      lastChangedRevision: '6',
      kind: 'dir'
    });
    expect(parseInfoXml('<info></info>')).toEqual({});
  });
});
