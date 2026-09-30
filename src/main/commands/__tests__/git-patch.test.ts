import { listPatchFiles, parsePatchFileOperations } from '../git-patch';

const PATCH = [
  'diff --git a/app.txt b/app.txt',
  'index 1111111..2222222 100644',
  '--- a/app.txt',
  '+++ b/app.txt',
  '@@ -1 +1 @@',
  '-a',
  '+b',
  'diff --git a/modulo/novo.txt b/modulo/novo.txt',
  'new file mode 100644',
  'index 0000000..3333333',
  '--- /dev/null',
  '+++ b/modulo/novo.txt',
  '@@ -0,0 +1 @@',
  '+novo',
  'diff --git a/antigo.txt b/antigo.txt',
  'deleted file mode 100644',
  'index 4444444..0000000',
  '--- a/antigo.txt',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-antigo',
  'diff --git a/logo.png b/logo.png',
  'new file mode 100644',
  'index 0000000..5555555',
  'GIT binary patch',
  'literal 3',
  'KcmZ?wbN>Ja',
  ''
].join('\n');

describe('parsePatchFileOperations', () => {
  it('classifica arquivos criados, modificados e removidos, inclusive binarios', () => {
    const operations = parsePatchFileOperations(PATCH);

    expect(operations).toEqual({
      added: ['modulo/novo.txt', 'logo.png'],
      modified: ['app.txt'],
      deleted: ['antigo.txt']
    });
    expect(listPatchFiles(operations)).toHaveLength(4);
  });

  it('retorna listas vazias para patch vazio', () => {
    expect(parsePatchFileOperations('')).toEqual({ added: [], modified: [], deleted: [] });
  });
});
