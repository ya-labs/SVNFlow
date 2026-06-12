import { execSync } from 'node:child_process';

import { validateGitRepository } from '../git';
import { registerSavedEnvironmentFromLocalPaths } from '../register-saved-environment';
import { saveSavedEnvironment } from '../saved-environment-store';
import { validateSvnCheckout } from '../svn';

jest.mock('../git');
jest.mock('../svn');
jest.mock('../saved-environment-store');
jest.mock('node:child_process', () => ({
  execSync: jest.fn()
}));

const mockValidateGitRepository = validateGitRepository as jest.MockedFunction<typeof validateGitRepository>;
const mockValidateSvnCheckout = validateSvnCheckout as jest.MockedFunction<typeof validateSvnCheckout>;
const mockSaveSavedEnvironment = saveSavedEnvironment as jest.MockedFunction<typeof saveSavedEnvironment>;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('registerSavedEnvironmentFromLocalPaths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bloqueia cadastro quando workspace Git é inválido', async () => {
    mockValidateGitRepository.mockReturnValue({
      valid: false,
      message: 'Caminho não é um repositório Git válido.'
    });

    const result = await registerSavedEnvironmentFromLocalPaths({
      name: 'Projeto A',
      gitWorkspacePath: '/repo/invalido',
      svnCheckoutPath: '/repo/svn'
    });

    expect(result.canSave).toBe(false);
    expect(result.blockers[0].code).toBe('INVALID_GIT_WORKSPACE');
    expect(mockSaveSavedEnvironment).not.toHaveBeenCalled();
  });

  it('bloqueia cadastro quando checkout SVN é inválido', async () => {
    mockValidateGitRepository.mockReturnValue({
      valid: true,
      message: 'Repositório Git válido.'
    });
    mockValidateSvnCheckout.mockReturnValue({
      valid: false,
      message: 'Caminho não é um checkout SVN válido.'
    });

    const result = await registerSavedEnvironmentFromLocalPaths({
      name: 'Projeto B',
      gitWorkspacePath: '/repo/git',
      svnCheckoutPath: '/repo/invalido'
    });

    expect(result.canSave).toBe(false);
    expect(result.blockers[0].code).toBe('INVALID_SVN_CHECKOUT');
    expect(mockSaveSavedEnvironment).not.toHaveBeenCalled();
  });

  it('detecta metadados SVN localmente e salva ambiente válido', async () => {
    mockValidateGitRepository.mockReturnValue({
      valid: true,
      message: 'Repositório Git válido.'
    });
    mockValidateSvnCheckout.mockReturnValue({
      valid: true,
      message: 'Checkout SVN válido.',
      checkoutRoot: '/repo/svn'
    });

    mockExecSync
      .mockReturnValueOnce('https://svn.exemplo.local/projeto' as never)
      .mockReturnValueOnce('/repo/svn' as never)
      .mockReturnValueOnce('1234' as never);

    mockSaveSavedEnvironment.mockResolvedValue({
      ok: true,
      storagePath: '/tmp/saved-environments.json',
      environments: [],
      message: 'Ambientes salvos atualizados com sucesso.'
    });

    const result = await registerSavedEnvironmentFromLocalPaths({
      name: 'Projeto Local',
      gitWorkspacePath: '/repo/git',
      svnCheckoutPath: '/repo/svn',
      now: '2026-06-12T12:00:00.000Z'
    });

    expect(result.canSave).toBe(true);
    expect(result.savedEnvironment).toBeDefined();
    expect(result.savedEnvironment?.name).toBe('Projeto Local');
    expect(result.savedEnvironment?.svnUrl).toBe('https://svn.exemplo.local/projeto');
    expect(result.savedEnvironment?.svnRevision).toBe('1234');
    expect(result.savedEnvironment?.lastValidationStatus).toBe('ready');
    expect(mockSaveSavedEnvironment).toHaveBeenCalledTimes(1);
  });

  it('não exige nome técnico de repositório SVN e sugere nome amigável quando não informado', async () => {
    mockValidateGitRepository.mockReturnValue({
      valid: true,
      message: 'Repositório Git válido.'
    });
    mockValidateSvnCheckout.mockReturnValue({
      valid: true,
      message: 'Checkout SVN válido.',
      checkoutRoot: '/repo/svn'
    });

    mockExecSync
      .mockReturnValueOnce('https://svn.exemplo.local/projeto' as never)
      .mockReturnValueOnce('/repo/svn' as never)
      .mockReturnValueOnce('1234' as never);

    mockSaveSavedEnvironment.mockResolvedValue({
      ok: true,
      storagePath: '/tmp/saved-environments.json',
      environments: [],
      message: 'Ambientes salvos atualizados com sucesso.'
    });

    const result = await registerSavedEnvironmentFromLocalPaths({
      gitWorkspacePath: '/repo/forca-vendas',
      svnCheckoutPath: '/repo/svn',
      now: '2026-06-12T12:00:00.000Z'
    });

    expect(result.canSave).toBe(true);
    expect(result.suggestedName).toBe('forca-vendas');
    expect(result.savedEnvironment?.name).toBe('forca-vendas');
  });

  it('retorna mensagem orientativa quando falha para gravar armazenamento local', async () => {
    mockValidateGitRepository.mockReturnValue({
      valid: true,
      message: 'Repositório Git válido.'
    });
    mockValidateSvnCheckout.mockReturnValue({
      valid: true,
      message: 'Checkout SVN válido.',
      checkoutRoot: '/repo/svn'
    });

    mockExecSync
      .mockReturnValueOnce('https://svn.exemplo.local/projeto' as never)
      .mockReturnValueOnce('/repo/svn' as never)
      .mockReturnValueOnce('1234' as never);

    mockSaveSavedEnvironment.mockResolvedValue({
      ok: false,
      storagePath: '/tmp/saved-environments.json',
      environments: [],
      message: 'Falha ao gravar o armazenamento local de ambientes salvos.',
      errorCode: 'WRITE_FAILED'
    });

    const result = await registerSavedEnvironmentFromLocalPaths({
      name: 'Projeto Local',
      gitWorkspacePath: '/repo/git',
      svnCheckoutPath: '/repo/svn'
    });

    expect(result.canSave).toBe(false);
    expect(result.blockers[0].code).toBe('STORAGE_ERROR');
    expect(result.message).toContain('Falha ao acessar o armazenamento local');
  });
});