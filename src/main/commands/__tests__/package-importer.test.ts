import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

import { exportSvnflowPackage } from '../package-exporter.js';
import { importAndValidateSvnflowPackage } from '../package-importer.js';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  const serialized = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`);
  return `{${serialized.join(',')}}`;
}

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

  it('retorna erro de io quando o caminho aponta para uma pasta', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-importer-'));

    const result = await importAndValidateSvnflowPackage(tempDir);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('invalid');
    expect(result.errors.some((e) => e.code === 'PACKAGE_PATH_IS_DIRECTORY' && e.category === 'io')).toBe(true);
    expect(result.errors.some((e) => e.code === 'PACKAGE_EXTENSION_INVALID')).toBe(false);
  });

  it('aplica fallback em campo opcional de revisao (notas)', async () => {
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

    const result = await importAndValidateSvnflowPackage(exported.packagePath!);

    expect(result.ok).toBe(true);
    expect(result.review?.notes).toBe('Sem notas adicionais.');
  });

  it('retorna erro de campo obrigatorio quando secao O que mudou ausente', async () => {
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
    parsed.artifacts['pr.md'] = '# Revisao de Pacote SVNFlow\n\n- Ambiente: Ambiente Teste\n- Base: main\n- Arquivos afetados: 1';
    parsed.manifest.checksum = createHash('sha256')
      .update(stableStringify(parsed.artifacts), 'utf8')
      .digest('hex');
    await writeFile(exported.packagePath!, JSON.stringify(parsed, null, 2), 'utf8');

    const result = await importAndValidateSvnflowPackage(exported.packagePath!);

    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'REVIEW_WHAT_CHANGED_REQUIRED' && e.category === 'artifact')).toBe(true);
  });
});
