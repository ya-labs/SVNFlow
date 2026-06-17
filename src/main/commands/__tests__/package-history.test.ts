import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { appendPackageHistory, readPackageHistory } from '../package-history.js';

const BASE_ENTRY = {
  kind: 'exported' as const,
  packageId: 'pkg-test-001',
  packagePath: '/tmp/pacote.svnflow',
  environmentName: 'Ambiente Teste',
  baseBranch: 'main',
  totalAffectedFiles: 3,
  generatedAt: '2025-01-01T10:00:00.000Z'
};

describe('package-history', () => {
  it('registra e lê um evento de exportação', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-history-'));
    const storagePath = path.join(tempDir, 'package-history.json');

    const appendResult = await appendPackageHistory({
      entry: BASE_ENTRY,
      storagePath,
      now: '2025-01-01T12:00:00.000Z'
    });

    expect(appendResult.ok).toBe(true);
    expect(appendResult.entries).toHaveLength(1);
    expect(appendResult.entries[0].kind).toBe('exported');
    expect(appendResult.entries[0].packageId).toBe('pkg-test-001');
    expect(appendResult.entries[0].recordedAt).toBe('2025-01-01T12:00:00.000Z');

    const readResult = await readPackageHistory({ storagePath });
    expect(readResult.ok).toBe(true);
    expect(readResult.entries).toHaveLength(1);
  });

  it('acumula múltiplos eventos preservando ordem mais recente primeiro', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-history-'));
    const storagePath = path.join(tempDir, 'package-history.json');

    await appendPackageHistory({ entry: { ...BASE_ENTRY, packageId: 'pkg-001' }, storagePath, now: '2025-01-01T10:00:00.000Z' });
    await appendPackageHistory({ entry: { ...BASE_ENTRY, packageId: 'pkg-002', kind: 'imported' }, storagePath, now: '2025-01-01T11:00:00.000Z' });
    await appendPackageHistory({ entry: { ...BASE_ENTRY, packageId: 'pkg-003', kind: 'invalid' }, storagePath, now: '2025-01-01T12:00:00.000Z' });

    const readResult = await readPackageHistory({ storagePath });
    expect(readResult.entries).toHaveLength(3);
    expect(readResult.entries[0].packageId).toBe('pkg-003');
    expect(readResult.entries[1].packageId).toBe('pkg-002');
    expect(readResult.entries[2].packageId).toBe('pkg-001');
  });

  it('persiste dados corretamente no disco', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-history-'));
    const storagePath = path.join(tempDir, 'package-history.json');

    await appendPackageHistory({ entry: BASE_ENTRY, storagePath });

    const raw = await readFile(storagePath, 'utf8');
    const parsed = JSON.parse(raw);

    expect(parsed.version).toBe(1);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].kind).toBe('exported');
  });

  it('retorna histórico vazio sem erro quando o arquivo não existe', async () => {
    const result = await readPackageHistory({ storagePath: '/caminho/inexistente/history.json' });
    expect(result.ok).toBe(true);
    expect(result.entries).toHaveLength(0);
  });

  it('gera id único para cada entrada', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-history-'));
    const storagePath = path.join(tempDir, 'package-history.json');

    await appendPackageHistory({ entry: BASE_ENTRY, storagePath });
    await appendPackageHistory({ entry: BASE_ENTRY, storagePath });

    const result = await readPackageHistory({ storagePath });
    const ids = result.entries.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
