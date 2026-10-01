import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readAppSettings, updateAppSettings } from '../app-settings';
import { listPackageLibrary } from '../package-library';

describe('listPackageLibrary', () => {
  it('lista pacotes da pasta com status do historico e aponta referencias ausentes', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'svnflow-library-'));
    const exportedPath = path.join(directory, 'exportado.svnflow');
    await writeFile(exportedPath, JSON.stringify({
      manifest: { packageId: 'p1', formatVersion: '1.1.0', generatedAt: '2026-01-01T00:00:00.000Z' },
      artifacts: { 'mini-pr.json': { title: 'Pacote exportado' }, 'pr.md': '# Outro titulo' }
    }));
    await writeFile(path.join(directory, 'quebrado.svnflow'), 'nao e json');
    await writeFile(path.join(directory, 'ignorado.txt'), 'x');

    const baseEntry = {
      environmentName: 'Ambiente',
      baseBranch: 'main',
      totalAffectedFiles: 1,
      generatedAt: '2026-01-01T00:00:00.000Z'
    };
    const result = await listPackageLibrary({
      directory,
      historyEntries: [
        { ...baseEntry, id: '3', kind: 'applied', packageId: 'p1', packagePath: exportedPath, recordedAt: '2026-01-03T00:00:00.000Z' },
        { ...baseEntry, id: '2', kind: 'exported', packageId: 'p1', packagePath: exportedPath, recordedAt: '2026-01-02T00:00:00.000Z' },
        { ...baseEntry, id: '1', kind: 'imported', packageId: 'p2', packagePath: path.join(directory, 'movido.svnflow'), recordedAt: '2026-01-01T00:00:00.000Z' },
        { ...baseEntry, id: '0', kind: 'committed', packageId: 'r2', packagePath: '', recordedAt: '2026-01-04T00:00:00.000Z' }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.items).toHaveLength(2);

    const exported = result.items.find((item) => item.fileName === 'exportado.svnflow');
    expect(exported).toMatchObject({ title: 'Pacote exportado', knownStatus: 'applied', readable: true });

    const broken = result.items.find((item) => item.fileName === 'quebrado.svnflow');
    expect(broken).toMatchObject({ readable: false, knownStatus: 'unknown' });

    expect(result.missingReferences.map((reference) => reference.packageId)).toEqual(['p2']);
  });

  it('trata pasta ainda nao criada como lista vazia', async () => {
    const result = await listPackageLibrary({ directory: path.join(os.tmpdir(), 'svnflow-inexistente-xyz') });

    expect(result.ok).toBe(true);
    expect(result.message).toContain('primeira exportação');
    expect(result.items).toEqual([]);
  });
});

describe('app-settings', () => {
  it('usa pasta padrao e persiste a pasta escolhida', async () => {
    const baseDirectory = await mkdtemp(path.join(os.tmpdir(), 'svnflow-settings-'));

    expect((await readAppSettings({ baseDirectory })).packagesDirectory).toBe(path.join(baseDirectory, '.svnflow', 'packages'));

    await updateAppSettings({ packagesDirectory: '/tmp/pacotes-equipe' }, { baseDirectory });

    expect((await readAppSettings({ baseDirectory })).packagesDirectory).toBe('/tmp/pacotes-equipe');
  });

  it('persiste o tema e ignora valores desconhecidos', async () => {
    const baseDirectory = await mkdtemp(path.join(os.tmpdir(), 'svnflow-settings-'));

    expect((await readAppSettings({ baseDirectory })).theme).toBe('system');

    await updateAppSettings({ theme: 'dark' }, { baseDirectory });
    const saved = await readAppSettings({ baseDirectory });
    expect(saved.theme).toBe('dark');
    expect(saved.packagesDirectory).toBe(path.join(baseDirectory, '.svnflow', 'packages'));

    await updateAppSettings({ theme: 'roxo' as never }, { baseDirectory });
    expect((await readAppSettings({ baseDirectory })).theme).toBe('dark');

    await writeFile(path.join(baseDirectory, '.svnflow', 'settings.json'), JSON.stringify({ version: 1, theme: 'roxo' }));
    expect((await readAppSettings({ baseDirectory })).theme).toBe('system');
  });
});
