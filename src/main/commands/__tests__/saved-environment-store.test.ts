import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
	readSavedEnvironments,
	saveSavedEnvironment,
	updateSavedEnvironment,
	writeSavedEnvironments
} from '../saved-environment-store';

describe('saved-environment-store', () => {
	let tempDirectory: string;
	let storagePath: string;

	beforeEach(async () => {
		tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'svnflow-saved-env-'));
		storagePath = path.join(tempDirectory, 'saved-environments.json');
	});

	afterEach(async () => {
		await rm(tempDirectory, { recursive: true, force: true });
	});

	it('cria, lê e grava ambiente salvo em arquivo local', async () => {
		const saveResult = await saveSavedEnvironment({
			storagePath,
			environment: {
				id: 'env-1',
				name: 'Projeto Local',
				gitWorkspacePath: '/repo/git',
				svnCheckoutPath: '/repo/svn',
				svnUrl: 'https://svn.exemplo.local/projeto',
				svnCheckoutRoot: '/repo/svn',
				svnRevision: '1234',
				lastValidatedAt: '2026-06-12T12:00:00.000Z',
				lastValidationStatus: 'ready'
			}
		});

		expect(saveResult.ok).toBe(true);
		expect(saveResult.environments).toHaveLength(1);

		const readResult = await readSavedEnvironments({ storagePath });

		expect(readResult.ok).toBe(true);
		expect(readResult.environments).toEqual([
			{
				id: 'env-1',
				name: 'Projeto Local',
				gitWorkspacePath: '/repo/git',
				svnCheckoutPath: '/repo/svn',
				svnUrl: 'https://svn.exemplo.local/projeto',
				svnCheckoutRoot: '/repo/svn',
				svnRevision: '1234',
				lastValidatedAt: '2026-06-12T12:00:00.000Z',
				lastValidationStatus: 'ready'
			}
		]);

		const rawFile = await readFile(storagePath, 'utf8');
		expect(JSON.parse(rawFile)).toMatchObject({
			version: 1,
			environments: [
				{
					id: 'env-1',
					name: 'Projeto Local'
				}
			]
		});
	});

	it('rejeita dados mínimos inválidos e não grava o arquivo', async () => {
		const result = await saveSavedEnvironment({
			storagePath,
			environment: {
				id: 'env-invalido',
				name: '',
				gitWorkspacePath: '',
				svnCheckoutPath: '/repo/svn'
			}
		});

		expect(result.ok).toBe(false);
		expect(result.errorCode).toBe('INVALID_ENVIRONMENT');
		expect(result.environments).toHaveLength(0);
	});

	it('atualiza ambiente salvo existente sem persistir campos sensíveis extras', async () => {
		await writeSavedEnvironments(
			[
				{
					id: 'env-1',
					name: 'Projeto Local',
					gitWorkspacePath: '/repo/git',
					svnCheckoutPath: '/repo/svn',
					svnRevision: '1234'
				}
			],
			{ storagePath }
		);

		const updateResult = await updateSavedEnvironment({
			storagePath,
			environmentId: 'env-1',
			changes: {
				name: 'Projeto Local Atualizado',
				gitWorkspacePath: '/repo/git-atualizado',
				svnCheckoutPath: '/repo/svn-atualizado'
			}
		});

		expect(updateResult.ok).toBe(true);
		expect(updateResult.environments[0]).toMatchObject({
			id: 'env-1',
			name: 'Projeto Local Atualizado',
			gitWorkspacePath: '/repo/git-atualizado',
			svnCheckoutPath: '/repo/svn-atualizado'
		});

		const secretInput = {
			id: 'env-1',
			name: 'Projeto Local Atualizado',
			gitWorkspacePath: '/repo/git-atualizado',
			svnCheckoutPath: '/repo/svn-atualizado',
			svnRevision: '1234',
			svnPassword: 'senha-secreta',
			patchContent: 'conteudo-sensivel'
		} as never;

		await saveSavedEnvironment({
			storagePath,
			environment: secretInput
		});

		const rawFile = await readFile(storagePath, 'utf8');
		expect(rawFile).not.toContain('svnPassword');
		expect(rawFile).not.toContain('patchContent');
	});

	it('retorna falha clara quando tenta atualizar ambiente inexistente', async () => {
		const result = await updateSavedEnvironment({
			storagePath,
			environmentId: 'inexistente',
			changes: {
				name: 'Novo nome'
			}
		});

		expect(result.ok).toBe(false);
		expect(result.errorCode).toBe('NOT_FOUND');
	});
});