import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readAppSettings, resolveAppSettingsPath, updateAppSettings } from '../app-settings';

describe('configurações do app', () => {
  let base: string;

  beforeEach(() => {
    base = mkdtempSync(path.join(os.tmpdir(), 'svnflow-settings-'));
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it('sugere ~/svn como pasta de checkout e guarda a escolhida', async () => {
    expect((await readAppSettings({ baseDirectory: base })).checkoutDirectory).toBe(path.join(base, 'svn'));

    const chosen = path.join(base, 'projetos', 'svn');
    expect((await updateAppSettings({ checkoutDirectory: `${chosen}/` }, { baseDirectory: base })).checkoutDirectory).toBe(chosen);
    expect((await readAppSettings({ baseDirectory: base })).checkoutDirectory).toBe(chosen);
    expect(JSON.parse(readFileSync(resolveAppSettingsPath(base), 'utf8')).checkoutDirectory).toBe(chosen);
  });

  it('ignora pasta relativa ou vazia e mantém a atual', async () => {
    const chosen = path.join(base, 'checkouts');
    await updateAppSettings({ checkoutDirectory: chosen }, { baseDirectory: base });

    expect((await updateAppSettings({ checkoutDirectory: 'relativa/pasta' }, { baseDirectory: base })).checkoutDirectory).toBe(chosen);
    expect((await updateAppSettings({ checkoutDirectory: '' }, { baseDirectory: base })).checkoutDirectory).toBe(chosen);
  });
});
