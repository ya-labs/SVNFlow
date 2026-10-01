import { readFile, stat } from 'node:fs/promises';

import { listPatchFiles, parsePatchFileOperations } from './git-patch.js';
import { calculateArtifactsChecksum, type SvnflowManifest, type SvnflowPackageFile } from './package-exporter.js';

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
  context: string;
  author: string;
  environmentName: string;
  branch: string;
  baseBranch: string;
  totalAffectedFiles: number;
  generatedAt: string;
  whatChanged: string[];
  files: Array<{ path: string; status: string }>;
  notes: string;
  markdown: string;
  missingOptionalFields: string[];
}

export interface ImportPackageResult {
  ok: boolean;
  status: 'valid' | 'invalid';
  message: string;
  packagePath: string;
  manifest?: SvnflowManifest;
  summary?: ImportPackageSummary;
  review?: ImportPackageReview;
  canApply: boolean;
  applyBlockReason?: string;
  patchFiles?: string[];
  errors: ImportPackageValidationError[];
}

export interface ValidatedPackagePatch {
  ok: boolean;
  message: string;
  result: ImportPackageResult;
  patchContent?: string;
}

const SUPPORTED_FORMAT_VERSIONS = ['1.0.0', '1.1.0'];
const NOT_INFORMED = 'Não informado.';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseMarkdownField(markdown: string, label: string): string | undefined {
  const expression = new RegExp(`^-\\s*${label}:\\s*(.+)$`, 'im');
  const match = markdown.match(expression);
  return match?.[1]?.trim();
}

function parseMarkdownTitle(markdown: string): string | undefined {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function readMarkdownSection(markdown: string, heading: string): string | undefined {
  const marker = new RegExp(`^##\\s+${heading}\\s*$`, 'im');
  const markerMatch = markdown.match(marker);

  if (!markerMatch || markerMatch.index === undefined) {
    return undefined;
  }

  const rest = markdown.slice(markerMatch.index + markerMatch[0].length);
  const nextHeading = rest.search(/^##\s+/m);
  const section = (nextHeading >= 0 ? rest.slice(0, nextHeading) : rest).trim();

  return section.length > 0 ? section : undefined;
}

function parseBulletLines(section: string | undefined): string[] {
  if (!section) {
    return [];
  }

  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter((line) => line.length > 0);
}

function isNotInformed(value: string | undefined): boolean {
  return !value || /^n[aã]o informad[oa]\.?$/i.test(value.trim());
}

function buildReview(
  parsed: SvnflowPackageFile,
  errors: ImportPackageValidationError[]
): ImportPackageReview | undefined {
  const markdown = parsed.artifacts['pr.md'];
  const preview = parsed.artifacts['preview.json'];
  const miniPr = parsed.artifacts['mini-pr.json'];

  if (!isNonEmptyString(markdown)) {
    errors.push({
      code: 'REVIEW_MARKDOWN_REQUIRED',
      category: 'artifact',
      message: 'Revisao indisponivel: pr.md obrigatorio para renderizacao.',
      path: 'artifacts.pr.md'
    });
    return undefined;
  }

  const whatChanged = parseBulletLines(readMarkdownSection(markdown, 'O que mudou'));
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

  if (typeof preview?.workspace?.totalAffectedFiles !== 'number') {
    errors.push({
      code: 'REVIEW_TOTAL_AFFECTED_REQUIRED',
      category: 'artifact',
      message: 'Revisao invalida: total de arquivos afetados e obrigatorio.',
      path: 'artifacts.preview.json.workspace.totalAffectedFiles'
    });
  }

  const generatedAt = parseMarkdownField(markdown, 'Gerado em') ?? parsed.manifest.generatedAt;
  const branch = parseMarkdownField(markdown, 'Branch') ?? preview?.workspace?.branch ?? 'nao identificado';
  const title = miniPr?.title || parseMarkdownTitle(markdown) || 'Revisao de Pacote SVNFlow';
  const context = miniPr?.context || readMarkdownSection(markdown, 'Contexto');
  const notes = miniPr?.notes || readMarkdownSection(markdown, 'Observações') || parseMarkdownField(markdown, 'Notas');
  const author = parsed.manifest.author || parseMarkdownField(markdown, 'Autor');
  const missingOptionalFields: string[] = [];

  if (isNotInformed(context)) {
    missingOptionalFields.push('contexto');
  }

  if (isNotInformed(notes)) {
    missingOptionalFields.push('observações');
  }

  if (isNotInformed(author)) {
    missingOptionalFields.push('autor');
  }

  return {
    title,
    context: isNotInformed(context) ? NOT_INFORMED : context!,
    author: isNotInformed(author) ? NOT_INFORMED : author!,
    environmentName: preview?.environment?.environmentName ?? '',
    branch,
    baseBranch: preview?.workspace?.baseBranch ?? '',
    totalAffectedFiles: preview?.workspace?.totalAffectedFiles ?? 0,
    generatedAt,
    whatChanged,
    files: (preview?.workspace?.files ?? []).map((file) => ({ path: file.path, status: file.status })),
    notes: isNotInformed(notes) ? 'Sem notas adicionais.' : notes!,
    markdown,
    missingOptionalFields
  };
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

  if (!SUPPORTED_FORMAT_VERSIONS.includes(String(manifestObj.formatVersion))) {
    errors.push({
      code: 'UNSUPPORTED_FORMAT_VERSION',
      category: 'schema',
      message: `formatVersion nao suportado. Esperado: ${SUPPORTED_FORMAT_VERSIONS.join(' ou ')}.`,
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

function createInvalidResult(
  packagePath: string,
  message: string,
  errors: ImportPackageValidationError[]
): ImportPackageResult {
  return {
    ok: false,
    status: 'invalid',
    message,
    packagePath,
    canApply: false,
    errors
  };
}

export async function importAndValidateSvnflowPackage(packagePath: string): Promise<ImportPackageResult> {
  const normalizedPath = packagePath.trim();
  const errors: ImportPackageValidationError[] = [];

  if (!normalizedPath) {
    return createInvalidResult(normalizedPath, 'Caminho do pacote .svnflow nao informado.', [
      {
        code: 'PACKAGE_PATH_REQUIRED',
        category: 'io',
        message: 'Informe o caminho completo do arquivo .svnflow.',
        path: 'input.packagePath'
      }
    ]);
  }

  try {
    const fileInfo = await stat(normalizedPath);

    if (fileInfo.isDirectory()) {
      return createInvalidResult(normalizedPath, 'O caminho informado aponta para uma pasta, nao para um arquivo .svnflow.', [
        {
          code: 'PACKAGE_PATH_IS_DIRECTORY',
          category: 'io',
          message: 'Informe o caminho completo de um arquivo .svnflow, nao de uma pasta.',
          path: normalizedPath
        }
      ]);
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
    return createInvalidResult(normalizedPath, 'Falha ao ler arquivo .svnflow.', [
      ...errors,
      {
        code: 'PACKAGE_READ_FAILED',
        category: 'io',
        message: error instanceof Error ? error.message : 'Erro desconhecido ao ler arquivo.',
        path: normalizedPath
      }
    ]);
  }

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(raw);
  } catch (error) {
    return createInvalidResult(normalizedPath, 'JSON do pacote .svnflow invalido.', [
      {
        code: 'PACKAGE_JSON_INVALID',
        category: 'schema',
        message: error instanceof Error ? error.message : 'Erro desconhecido ao interpretar JSON.',
        path: normalizedPath
      }
    ]);
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

    if (calculateArtifactsChecksum(parsed.artifacts) !== manifest.checksum) {
      errors.push({
        code: 'CHECKSUM_MISMATCH',
        category: 'integrity',
        message: 'Checksum do pacote nao confere com os artefatos.',
        path: 'manifest.checksum'
      });
    }
  }

  if (errors.length > 0) {
    return createInvalidResult(normalizedPath, 'Pacote .svnflow invalido. Revise os erros de validacao.', errors);
  }

  const validPackage = parsed as unknown as SvnflowPackageFile;
  const review = buildReview(validPackage, errors);

  if (errors.length > 0) {
    return {
      ...createInvalidResult(normalizedPath, 'Pacote .svnflow invalido para revisao. Revise os erros obrigatorios.', errors),
      manifest: validPackage.manifest,
      summary: buildSummary(validPackage),
      review
    };
  }

  const patchContent = validPackage.artifacts['patch.diff'];
  const hasPatch = isNonEmptyString(patchContent);

  return {
    ok: true,
    status: 'valid',
    message: 'Pacote .svnflow importado e validado com sucesso.',
    packagePath: normalizedPath,
    manifest: validPackage.manifest,
    summary: buildSummary(validPackage),
    review,
    canApply: hasPatch,
    applyBlockReason: hasPatch
      ? undefined
      : 'Pacote no formato 1.0.0 sem patch.diff: disponível apenas para revisão.',
    patchFiles: hasPatch ? listPatchFiles(parsePatchFileOperations(patchContent)) : undefined,
    errors: []
  };
}

export async function readValidatedPackagePatch(packagePath: string): Promise<ValidatedPackagePatch> {
  const result = await importAndValidateSvnflowPackage(packagePath);

  if (!result.ok) {
    return { ok: false, message: result.message, result };
  }

  if (!result.canApply) {
    return { ok: false, message: result.applyBlockReason ?? 'Pacote sem patch aplicável.', result };
  }

  const raw = JSON.parse(await readFile(result.packagePath, 'utf8')) as SvnflowPackageFile;

  return {
    ok: true,
    message: 'Patch do pacote validado para aplicação.',
    result,
    patchContent: raw.artifacts['patch.diff']
  };
}
