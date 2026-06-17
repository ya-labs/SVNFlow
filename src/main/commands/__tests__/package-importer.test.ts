import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { exportSvnflowPackage } from '../package-exporter.js';
import { importAndValidateSvnflowPackage } from '../package-importer.js';

describe('package-importer', () => {
  it('valida pacote .svnflow gerado pelo exportador', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-importer-'));

    const exported = await exportSvnflowPackage({
      outputDirectory: tempDir,
      preview: {
        environment: {
          environmentName: 'Ambiente Teste',
          gitWorkspacePath: '/tmp/git',
          svnCheckoutPath: '/tmp/svn'
        },
        workspace: {
          branch: 'feat/teste',
          baseBranch: 'main',
          totalAffectedFiles: 1,
          files: [
            {
              path: 'src/a.ts',
              status: 'Modificado',
              description: 'Modificado: src/a.ts',
              rawStatus: 'M'
            }
          ]
        },
        blockers: [],
        alerts: []
      }
    });

    expect(exported.ok).toBe(true);
    expect(exported.packagePath).toBeDefined();

    const result = await importAndValidateSvnflowPackage(exported.packagePath!);

    expect(result.ok).toBe(true);
    expect(result.status).toBe('valid');
    expect(result.errors).toHaveLength(0);
    expect(result.summary?.environmentName).toBe('Ambiente Teste');
  });

  it('retorna erro de integridade quando checksum nao confere', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-importer-'));

    const exported = await exportSvnflowPackage({
      outputDirectory: tempDir,
      preview: {
        environment: {
          environmentName: 'Ambiente Teste',
          gitWorkspacePath: '/tmp/git',
          svnCheckoutPath: '/tmp/svn'
        },
        workspace: {
          branch: 'feat/teste',
          baseBranch: 'main',
          totalAffectedFiles: 1,
          files: [
            {
              path: 'src/a.ts',
              status: 'Modificado',
              description: 'Modificado: src/a.ts',
              rawStatus: 'M'
            }
          ]
        },
        blockers: [],
        alerts: []
      }
    });

    const raw = await readFile(exported.packagePath!, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, any>;
    parsed.artifacts['pr.md'] = `${parsed.artifacts['pr.md']}\n\nAlterado`;
    await writeFile(exported.packagePath!, JSON.stringify(parsed, null, 2), 'utf8');

    const result = await importAndValidateSvnflowPackage(exported.packagePath!);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('invalid');
    expect(result.errors.some((e) => e.code === 'CHECKSUM_MISMATCH' && e.category === 'integrity')).toBe(true);
  });

  it('retorna erro de schema para arquivo sem extensao .svnflow', async () => {
    const result = await importAndValidateSvnflowPackage('/tmp/arquivo.json');

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'PACKAGE_EXTENSION_INVALID' && e.category === 'schema')).toBe(true);
  });
});
