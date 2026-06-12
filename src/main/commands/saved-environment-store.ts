import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { SavedEnvironment, SavedEnvironmentValidationStatus } from './saved-environments';

export type SavedEnvironmentStorageErrorCode =
	| 'INVALID_ENVIRONMENT'
	| 'INVALID_STORAGE_FILE'
	| 'NOT_FOUND'
	| 'READ_FAILED'
	| 'WRITE_FAILED'
	| 'ALREADY_EXISTS';

export interface SavedEnvironmentStorageFile {
	version: 1;
	updatedAt: string;
	environments: SavedEnvironment[];
}

export interface SavedEnvironmentStorageOptions {
	storagePath?: string;
}

export interface SavedEnvironmentStorageResult {
	ok: boolean;
	storagePath: string;
	environments: SavedEnvironment[];
	message: string;
	errorCode?: SavedEnvironmentStorageErrorCode;
}

export interface SaveSavedEnvironmentInput extends SavedEnvironmentStorageOptions {
	environment: SavedEnvironment;
}

export interface UpdateSavedEnvironmentInput extends SavedEnvironmentStorageOptions {
	environmentId: string;
	changes: SavedEnvironmentChanges;
}

export interface SavedEnvironmentChanges {
	name?: string;
	gitWorkspacePath?: string;
	svnCheckoutPath?: string;
	svnUrl?: string;
	svnCheckoutRoot?: string;
	svnRevision?: string;
	lastValidatedAt?: string;
	lastValidationStatus?: Exclude<SavedEnvironmentValidationStatus, 'pending'>;
}

const STORAGE_FILE_NAME = 'saved-environments.json';
const STORAGE_DIRECTORY_NAME = '.svnflow';

function isNonEmptyText(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isValidTimestamp(value: string | undefined): boolean {
	if (value === undefined) {
		return true;
	}

	return !Number.isNaN(Date.parse(value));
}

function normalizeText(value: string): string {
	return value.trim();
}

function normalizeOptionalText(value: unknown): string | undefined {
	return isNonEmptyText(value) ? normalizeText(value) : undefined;
}

function getStoragePath(storagePath?: string): string {
	return storagePath ?? resolveSavedEnvironmentStoragePath();
}

function createFailure(
	storagePath: string,
	message: string,
	errorCode: SavedEnvironmentStorageErrorCode,
	environments: SavedEnvironment[] = []
): SavedEnvironmentStorageResult {
	return {
		ok: false,
		storagePath,
		environments,
		message,
		errorCode
	};
}

function createSuccess(
	storagePath: string,
	environments: SavedEnvironment[],
	message: string
): SavedEnvironmentStorageResult {
	return {
		ok: true,
		storagePath,
		environments,
		message
	};
}

function sanitizeSavedEnvironment(environment: SavedEnvironment): SavedEnvironment {
	return {
		id: normalizeText(environment.id),
		name: normalizeText(environment.name),
		gitWorkspacePath: normalizeText(environment.gitWorkspacePath),
		svnCheckoutPath: normalizeText(environment.svnCheckoutPath),
		svnUrl: normalizeOptionalText(environment.svnUrl),
		svnCheckoutRoot: normalizeOptionalText(environment.svnCheckoutRoot),
		svnRevision: normalizeOptionalText(environment.svnRevision),
		lastValidatedAt: normalizeOptionalText(environment.lastValidatedAt),
		lastValidationStatus: environment.lastValidationStatus
	};
}

function validateSavedEnvironment(environment: SavedEnvironment): string | undefined {
	if (!isNonEmptyText(environment.id)) {
		return 'O ambiente salvo precisa de um identificador válido.';
	}

	if (!isNonEmptyText(environment.name)) {
		return 'O ambiente salvo precisa de um nome válido.';
	}

	if (!isNonEmptyText(environment.gitWorkspacePath)) {
		return 'O ambiente salvo precisa de um caminho válido para o workspace Git.';
	}

	if (!isNonEmptyText(environment.svnCheckoutPath)) {
		return 'O ambiente salvo precisa de um caminho válido para o checkout SVN.';
	}

	if (!isValidTimestamp(environment.lastValidatedAt)) {
		return 'A data da última validação precisa ser uma data válida.';
	}

	return undefined;
}

function validateSavedEnvironmentList(environments: SavedEnvironment[]): string | undefined {
	for (const environment of environments) {
		const validationError = validateSavedEnvironment(environment);

		if (validationError) {
			return validationError;
		}
	}

	return undefined;
}

function toStorageFile(environments: SavedEnvironment[]): SavedEnvironmentStorageFile {
	return {
		version: 1,
		updatedAt: new Date().toISOString(),
		environments: environments.map(sanitizeSavedEnvironment)
	};
}

function isSavedEnvironmentStorageFile(value: unknown): value is SavedEnvironmentStorageFile {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as Partial<SavedEnvironmentStorageFile>;

	return candidate.version === 1
		&& isNonEmptyText(candidate.updatedAt)
		&& Array.isArray(candidate.environments)
		&& candidate.environments.every((environment) => validateSavedEnvironment(environment as SavedEnvironment) === undefined);
}

async function ensureStorageDirectory(storagePath: string): Promise<void> {
	await mkdir(path.dirname(storagePath), { recursive: true });
}

async function persistStorageFile(
	storagePath: string,
	environments: SavedEnvironment[]
): Promise<SavedEnvironmentStorageResult> {
	const validationError = validateSavedEnvironmentList(environments);

	if (validationError) {
		return createFailure(storagePath, validationError, 'INVALID_ENVIRONMENT', []);
	}

	try {
		await ensureStorageDirectory(storagePath);

		const temporaryStoragePath = `${storagePath}.tmp`;
		const file = toStorageFile(environments);

		await writeFile(temporaryStoragePath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
		await rename(temporaryStoragePath, storagePath);

		return createSuccess(storagePath, file.environments, 'Ambientes salvos atualizados com sucesso.');
	} catch (error) {
		return createFailure(
			storagePath,
			`Falha ao gravar o armazenamento local de ambientes salvos: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
			'WRITE_FAILED',
			environments
		);
	}
}

function cloneEnvironments(environments: SavedEnvironment[]): SavedEnvironment[] {
	return environments.map((environment) => ({ ...environment }));
}

function isFileNotFoundError(error: unknown): boolean {
	return typeof error === 'object'
		&& error !== null
		&& 'code' in error
		&& (error as { code?: string }).code === 'ENOENT';
}

export function resolveSavedEnvironmentStoragePath(baseDirectory: string = os.homedir()): string {
	return path.join(baseDirectory, STORAGE_DIRECTORY_NAME, STORAGE_FILE_NAME);
}

export async function readSavedEnvironments(
	options?: SavedEnvironmentStorageOptions
): Promise<SavedEnvironmentStorageResult> {
	const storagePath = getStoragePath(options?.storagePath);

	try {
		const rawContent = await readFile(storagePath, 'utf8');
		const parsedContent: unknown = JSON.parse(rawContent);

		if (!isSavedEnvironmentStorageFile(parsedContent)) {
			return createFailure(
				storagePath,
				'O arquivo local de ambientes salvos está inválido.',
				'INVALID_STORAGE_FILE'
			);
		}

		return createSuccess(
			storagePath,
			cloneEnvironments(parsedContent.environments),
			parsedContent.environments.length > 0
				? `${parsedContent.environments.length} ambiente(s) salvo(s) carregado(s).`
				: 'Nenhum ambiente salvo encontrado.'
		);
	} catch (error) {
		if (isFileNotFoundError(error)) {
			return createSuccess(storagePath, [], 'Nenhum ambiente salvo encontrado.');
		}

		return createFailure(
			storagePath,
			`Falha ao ler o armazenamento local de ambientes salvos: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
			'READ_FAILED'
		);
	}
}

export async function writeSavedEnvironments(
	environments: SavedEnvironment[],
	options?: SavedEnvironmentStorageOptions
): Promise<SavedEnvironmentStorageResult> {
	const storagePath = getStoragePath(options?.storagePath);
	return persistStorageFile(storagePath, environments);
}

export async function saveSavedEnvironment(
	input: SaveSavedEnvironmentInput
): Promise<SavedEnvironmentStorageResult> {
	const storagePath = getStoragePath(input.storagePath);
	const current = await readSavedEnvironments({ storagePath });

	if (!current.ok) {
		return current;
	}

	if (current.environments.some((environment) => environment.id === input.environment.id)) {
		return createFailure(
			storagePath,
			`Já existe um ambiente salvo com o identificador ${input.environment.id}.`,
			'ALREADY_EXISTS',
			current.environments
		);
	}

	return persistStorageFile(storagePath, [...current.environments, input.environment]);
}

export async function updateSavedEnvironment(
	input: UpdateSavedEnvironmentInput
): Promise<SavedEnvironmentStorageResult> {
	const storagePath = getStoragePath(input.storagePath);
	const current = await readSavedEnvironments({ storagePath });

	if (!current.ok) {
		return current;
	}

	const index = current.environments.findIndex((environment) => environment.id === input.environmentId);

	if (index < 0) {
		return createFailure(
			storagePath,
			`Ambiente salvo ${input.environmentId} não encontrado para atualização.`,
			'NOT_FOUND',
			current.environments
		);
	}

	const updatedEnvironment = {
		...current.environments[index],
		...input.changes,
		id: current.environments[index].id
	};

	const validationError = validateSavedEnvironment(updatedEnvironment);

	if (validationError) {
		return createFailure(storagePath, validationError, 'INVALID_ENVIRONMENT', current.environments);
	}

	const updatedEnvironments = [...current.environments];
	updatedEnvironments[index] = updatedEnvironment;

	return persistStorageFile(storagePath, updatedEnvironments);
}