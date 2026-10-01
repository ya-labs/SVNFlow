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

const SAMPLE_PATCH = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1111111..2222222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1 +1 @@',
  '-export const a = 1;',
  '+export const a = 2;',
  ''
].join('\n');

const SAMPLE_MINI_PR = {
  title: 'Ajusta constante do modulo A',
  context: 'Valor anterior estava incorreto.',
  whatChanged: 'Atualiza constante a para 2.',
  notes: ''
};

const SAMPLE_PREVIEW = {
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
};

describe('package-importer', () => {
  it('valida pacote .svnflow gerado pelo exportador', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-importer-'));

    const exported = await exportSvnflowPackage({
      outputDirectory: tempDir,
      patchContent: SAMPLE_PATCH,
      miniPr: SAMPLE_MINI_PR,
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
      patchContent: SAMPLE_PATCH,
      miniPr: SAMPLE_MINI_PR,
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
      patchContent: SAMPLE_PATCH,
      miniPr: SAMPLE_MINI_PR,
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
      patchContent: SAMPLE_PATCH,
      miniPr: SAMPLE_MINI_PR,
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

  it('bloqueia exportacao quando campos obrigatorios da mini PR estao vazios', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-importer-'));

    const exported = await exportSvnflowPackage({
      outputDirectory: tempDir,
      patchContent: SAMPLE_PATCH,
      miniPr: { title: 'Titulo', context: ' ', whatChanged: '', notes: '' },
      preview: SAMPLE_PREVIEW
    });

    expect(exported.ok).toBe(false);
    expect(exported.errorCode).toBe('INVALID_MINI_PR');
    expect(exported.pendingRequiredFields).toEqual(['context', 'whatChanged']);
  });

  it('bloqueia exportacao sem patch', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-importer-'));

    const exported = await exportSvnflowPackage({
      outputDirectory: tempDir,
      patchContent: '  ',
      miniPr: SAMPLE_MINI_PR,
      preview: SAMPLE_PREVIEW
    });

    expect(exported.ok).toBe(false);
    expect(exported.errorCode).toBe('INVALID_PATCH');
  });

  it('renderiza revisao a partir da mini PR e libera aplicacao com patch', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-importer-'));

    const exported = await exportSvnflowPackage({
      outputDirectory: tempDir,
      patchContent: SAMPLE_PATCH,
      miniPr: SAMPLE_MINI_PR,
      author: 'Pessoa Teste',
      preview: SAMPLE_PREVIEW
    });

    expect(exported.manifest?.formatVersion).toBe('1.1.0');
    expect(path.basename(exported.packagePath!)).toMatch(/ajusta-constante-do-modulo-a\.svnflow$/);

    const result = await importAndValidateSvnflowPackage(exported.packagePath!);

    expect(result.ok).toBe(true);
    expect(result.canApply).toBe(true);
    expect(result.patchFiles).toEqual(['src/a.ts']);
    expect(result.review?.title).toBe('Ajusta constante do modulo A');
    expect(result.review?.context).toBe('Valor anterior estava incorreto.');
    expect(result.review?.author).toBe('Pessoa Teste');
    expect(result.review?.whatChanged).toEqual(['Atualiza constante a para 2.']);
    expect(result.review?.missingOptionalFields).toEqual(['observações']);
  });

  it('aceita pacote legado 1.0.0 apenas para revisao', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'svnflow-importer-'));
    const artifacts = {
      'preview.json': SAMPLE_PREVIEW,
      'pr.md': '# Revisao de Pacote SVNFlow\n\n- Ambiente: Ambiente Teste\n- Base: main\n\n## O que mudou\n- **Modificado** src/a.ts'
    };
    const packagePath = path.join(tempDir, 'legado.svnflow');
    await writeFile(packagePath, JSON.stringify({
      manifest: {
        formatVersion: '1.0.0',
        packageId: 'pacote-legado',
        generatedAt: '2026-01-01T00:00:00.000Z',
        checksumAlgorithm: 'sha256',
        checksum: createHash('sha256').update(stableStringify(artifacts), 'utf8').digest('hex'),
        requiredFields: ['manifest.packageId', 'artifacts.pr.md'],
        artifacts: { previewJson: 'preview.json', prMarkdown: 'pr.md' }
      },
      artifacts
    }), 'utf8');

    const result = await importAndValidateSvnflowPackage(packagePath);

    expect(result.ok).toBe(true);
    expect(result.canApply).toBe(false);
    expect(result.applyBlockReason).toContain('1.0.0');
  });
});
