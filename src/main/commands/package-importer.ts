import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';

import type { SvnflowManifest, SvnflowPackageFile } from './package-exporter.js';

export type ImportPackageErrorCategory = 'io' | 'schema' | 'integrity' | 'artifact';

export interface ImportPackageValidationError {
  code: string;
  category: ImportPackageErrorCategory;
  message: string;
  path?: string;
}

export interface ImportPackageSummary {
  packageId: string;
  generatedAt: string;
  environmentName: string;
  baseBranch: string;
  totalAffectedFiles: number;
}

export interface ImportPackageReview {
  title: string;
  environmentName: string;
  branch: string;
  baseBranch: string;
  totalAffectedFiles: number;
  generatedAt: string;
  whatChanged: string[];
  notes: string;
  markdown: string;
}

export interface ImportPackageResult {
  ok: boolean;
  status: 'valid' | 'invalid';
  message: string;
  packagePath: string;
  manifest?: SvnflowManifest;
  summary?: ImportPackageSummary;
  review?: ImportPackageReview;
  errors: ImportPackageValidationError[];
}

function parseMarkdownField(markdown: string, label: string): string | undefined {
  const expression = new RegExp(`^-\\s*${label}:\\s*(.+)$`, 'im');
  const match = markdown.match(expression);
  return match?.[1]?.trim();
}

function parseWhatChanged(markdown: string): string[] {
  const marker = /^##\s+O que mudou\s*$/im;
  const markerMatch = markdown.match(marker);

  if (!markerMatch || markerMatch.index === undefined) {
    return [];
  }

  const section = markdown.slice(markerMatch.index + markerMatch[0].length).trim();
  if (!section) {
    return [];
  }

  const lines = section.split('\n').map((line) => line.trim());
  return lines
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0);
}

function buildReview(
  parsed: SvnflowPackageFile,
  errors: ImportPackageValidationError[]
): ImportPackageReview | undefined {
  const markdown = parsed.artifacts['pr.md'];
  const preview = parsed.artifacts['preview.json'];

  if (!isNonEmptyString(markdown)) {
    errors.push({
      code: 'REVIEW_MARKDOWN_REQUIRED',
      category: 'artifact',
      message: 'Revisao indisponivel: pr.md obrigatorio para renderizacao.',
      path: 'artifacts.pr.md'
    });
    return undefined;
  }

  const whatChanged = parseWhatChanged(markdown);
  if (whatChanged.length === 0) {
    errors.push({
      code: 'REVIEW_WHAT_CHANGED_REQUIRED',
      category: 'artifact',
      message: 'Revisao invalida: secao "O que mudou" e obrigatoria.',
      path: 'artifacts.pr.md'
    });
  }

  if (!preview?.environment?.environmentName) {
    errors.push({
      code: 'REVIEW_ENVIRONMENT_REQUIRED',
      category: 'artifact',
      message: 'Revisao invalida: nome do ambiente e obrigatorio.',
      path: 'artifacts.preview.json.environment.environmentName'
    });
  }

  if (!preview?.workspace?.baseBranch) {
    errors.push({
      code: 'REVIEW_BASE_BRANCH_REQUIRED',
      category: 'artifact',
      message: 'Revisao invalida: branch base e obrigatoria.',
      path: 'artifacts.preview.json.workspace.baseBranch'
    });
  }

  const totalAffected = preview?.workspace?.totalAffectedFiles;
  if (typeof totalAffected !== 'number') {
    errors.push({
      code: 'REVIEW_TOTAL_AFFECTED_REQUIRED',
      category: 'artifact',
      message: 'Revisao invalida: total de arquivos afetados e obrigatorio.',
      path: 'artifacts.preview.json.workspace.totalAffectedFiles'
    });
  }

  const generatedAt = parseMarkdownField(markdown, 'Gerado em')
    ?? parsed.manifest.generatedAt;
  const branch = parseMarkdownField(markdown, 'Branch')
    ?? preview.workspace.branch
    ?? 'nao identificado';
  const notes = parseMarkdownField(markdown, 'Notas')
    ?? 'Sem notas adicionais.';

  return {
    title: 'Revisao de Pacote SVNFlow',
    environmentName: preview.environment.environmentName,
    branch,
    baseBranch: preview.workspace.baseBranch,
    totalAffectedFiles: preview.workspace.totalAffectedFiles,
    generatedAt,
    whatChanged,
    notes,
    markdown
  };
}

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

function readPathValue(target: unknown, dottedPath: string): unknown {
  const parts = dottedPath.split('.');
  let current: unknown = target;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];

    if (current === null || typeof current !== 'object') {
      return undefined;
    }

    const currentObject = current as Record<string, unknown>;

    if (part in currentObject) {
      current = currentObject[part];
      continue;
    }

    // Suporta chaves com ponto, como artifacts["preview.json"].
    const remainingPath = parts.slice(index).join('.');
    if (remainingPath in currentObject) {
      current = currentObject[remainingPath];
      return current;
    }

    return undefined;
  }

  return current;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateManifest(manifest: unknown): ImportPackageValidationError[] {
  const errors: ImportPackageValidationError[] = [];

  if (!manifest || typeof manifest !== 'object') {
    errors.push({
      code: 'MANIFEST_MISSING',
      category: 'schema',
      message: 'manifest ausente ou invalido.',
      path: 'manifest'
    });
    return errors;
  }

  const manifestObj = manifest as Record<string, unknown>;

  if (manifestObj.formatVersion !== '1.0.0') {
    errors.push({
      code: 'UNSUPPORTED_FORMAT_VERSION',
      category: 'schema',
      message: 'formatVersion nao suportado. Esperado: 1.0.0.',
      path: 'manifest.formatVersion'
    });
  }

  if (!isNonEmptyString(manifestObj.packageId)) {
    errors.push({
      code: 'PACKAGE_ID_INVALID',
      category: 'schema',
      message: 'packageId ausente ou invalido.',
      path: 'manifest.packageId'
    });
  }

  if (!isNonEmptyString(manifestObj.generatedAt)) {
    errors.push({
      code: 'GENERATED_AT_INVALID',
      category: 'schema',
      message: 'generatedAt ausente ou invalido.',
      path: 'manifest.generatedAt'
    });
  }

  if (manifestObj.checksumAlgorithm !== 'sha256') {
    errors.push({
      code: 'CHECKSUM_ALGORITHM_UNSUPPORTED',
      category: 'schema',
      message: 'checksumAlgorithm nao suportado. Esperado: sha256.',
      path: 'manifest.checksumAlgorithm'
    });
  }

  if (!isNonEmptyString(manifestObj.checksum)) {
    errors.push({
      code: 'CHECKSUM_INVALID',
      category: 'schema',
      message: 'checksum ausente ou invalido.',
      path: 'manifest.checksum'
    });
  }

  if (!Array.isArray(manifestObj.requiredFields)) {
    errors.push({
      code: 'REQUIRED_FIELDS_INVALID',
      category: 'schema',
      message: 'requiredFields ausente ou invalido.',
      path: 'manifest.requiredFields'
    });
  }

  return errors;
}

function validateRequiredFields(parsed: unknown, requiredFields: unknown): ImportPackageValidationError[] {
  if (!Array.isArray(requiredFields)) {
    return [];
  }

  const errors: ImportPackageValidationError[] = [];

  for (const fieldPath of requiredFields) {
    if (!isNonEmptyString(fieldPath)) {
      continue;
    }

    const value = readPathValue(parsed, fieldPath);

    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      errors.push({
        code: 'REQUIRED_FIELD_MISSING',
        category: 'schema',
        message: `Campo obrigatorio ausente: ${fieldPath}`,
        path: fieldPath
      });
    }
  }

  return errors;
}

function buildSummary(parsed: SvnflowPackageFile): ImportPackageSummary {
  return {
    packageId: parsed.manifest.packageId,
    generatedAt: parsed.manifest.generatedAt,
    environmentName: parsed.artifacts['preview.json'].environment.environmentName,
    baseBranch: parsed.artifacts['preview.json'].workspace.baseBranch,
    totalAffectedFiles: parsed.artifacts['preview.json'].workspace.totalAffectedFiles
  };
}

export async function importAndValidateSvnflowPackage(packagePath: string): Promise<ImportPackageResult> {
  const normalizedPath = packagePath.trim();
  const errors: ImportPackageValidationError[] = [];

  if (!normalizedPath) {
    return {
      ok: false,
      status: 'invalid',
      message: 'Caminho do pacote .svnflow nao informado.',
      packagePath: normalizedPath,
      errors: [
        {
          code: 'PACKAGE_PATH_REQUIRED',
          category: 'io',
          message: 'Informe o caminho completo do arquivo .svnflow.',
          path: 'input.packagePath'
        }
      ]
    };
  }

  try {
    const fileInfo = await stat(normalizedPath);

    if (fileInfo.isDirectory()) {
      return {
        ok: false,
        status: 'invalid',
        message: 'O caminho informado aponta para uma pasta, nao para um arquivo .svnflow.',
        packagePath: normalizedPath,
        errors: [
          {
            code: 'PACKAGE_PATH_IS_DIRECTORY',
            category: 'io',
            message: 'Informe o caminho completo de um arquivo .svnflow, nao de uma pasta.',
            path: normalizedPath
          }
        ]
      };
    }
  } catch {
    // Mantem a leitura abaixo como fonte do erro quando o arquivo nao existe ou nao pode ser acessado.
  }

  if (!normalizedPath.endsWith('.svnflow')) {
    errors.push({
      code: 'PACKAGE_EXTENSION_INVALID',
      category: 'schema',
      message: 'Arquivo precisa ter extensao .svnflow.',
      path: 'input.packagePath'
    });
  }

  let raw: string;
  try {
    raw = await readFile(normalizedPath, 'utf8');
  } catch (error) {
    return {
      ok: false,
      status: 'invalid',
      message: 'Falha ao ler arquivo .svnflow.',
      packagePath: normalizedPath,
      errors: [
        ...errors,
        {
          code: 'PACKAGE_READ_FAILED',
          category: 'io',
          message: error instanceof Error ? error.message : 'Erro desconhecido ao ler arquivo.',
          path: normalizedPath
        }
      ]
    };
  }

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      status: 'invalid',
      message: 'JSON do pacote .svnflow invalido.',
      packagePath: normalizedPath,
      errors: [
        {
          code: 'PACKAGE_JSON_INVALID',
          category: 'schema',
          message: error instanceof Error ? error.message : 'Erro desconhecido ao interpretar JSON.',
          path: normalizedPath
        }
      ]
    };
  }

  const parsed = parsedUnknown as Record<string, unknown>;

  errors.push(...validateManifest(parsed.manifest));

  const artifacts = parsed.artifacts as Record<string, unknown> | undefined;

  if (!artifacts || typeof artifacts !== 'object') {
    errors.push({
      code: 'ARTIFACTS_MISSING',
      category: 'artifact',
      message: 'Bloco artifacts ausente ou invalido.',
      path: 'artifacts'
    });
  } else {
    if (!artifacts['preview.json'] || typeof artifacts['preview.json'] !== 'object') {
      errors.push({
        code: 'ARTIFACT_PREVIEW_MISSING',
        category: 'artifact',
        message: 'Artefato preview.json ausente ou invalido.',
        path: 'artifacts.preview.json'
      });
    }

    if (!isNonEmptyString(artifacts['pr.md'])) {
      errors.push({
        code: 'ARTIFACT_PR_MD_MISSING',
        category: 'artifact',
        message: 'Artefato pr.md ausente ou invalido.',
        path: 'artifacts.pr.md'
      });
    }
  }

  const requiredFields = (parsed.manifest as Record<string, unknown> | undefined)?.requiredFields;
  errors.push(...validateRequiredFields(parsed, requiredFields));

  if (errors.length === 0) {
    const manifest = parsed.manifest as SvnflowManifest;
    const artifactsForChecksum = parsed.artifacts;

    const calculatedChecksum = createHash('sha256')
      .update(stableStringify(artifactsForChecksum), 'utf8')
      .digest('hex');

    if (calculatedChecksum !== manifest.checksum) {
      errors.push({
        code: 'CHECKSUM_MISMATCH',
        category: 'integrity',
        message: 'Checksum do pacote nao confere com os artefatos.',
        path: 'manifest.checksum'
      });
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      status: 'invalid',
      message: 'Pacote .svnflow invalido. Revise os erros de validacao.',
      packagePath: normalizedPath,
      errors
    };
  }

  const validPackage = parsed as unknown as SvnflowPackageFile;
  const review = buildReview(validPackage, errors);

  if (errors.length > 0) {
    return {
      ok: false,
      status: 'invalid',
      message: 'Pacote .svnflow invalido para revisao. Revise os erros obrigatorios.',
      packagePath: normalizedPath,
      manifest: validPackage.manifest,
      summary: buildSummary(validPackage),
      review,
      errors
    };
  }

  return {
    ok: true,
    status: 'valid',
    message: 'Pacote .svnflow importado e validado com sucesso.',
    packagePath: normalizedPath,
    manifest: validPackage.manifest,
    summary: buildSummary(validPackage),
    review,
    errors: []
  };
}
