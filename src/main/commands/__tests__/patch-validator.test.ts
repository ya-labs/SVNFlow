import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { validatePatchFit } from '../patch-validator';

jest.mock('child_process');
jest.mock('fs');

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockUnlinkSync = unlinkSync as jest.MockedFunction<typeof unlinkSync>;

describe('validatePatchFit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteFileSync.mockImplementation(() => undefined);
    mockUnlinkSync.mockImplementation(() => undefined);
  });

  it('retorna ready quando patch encaixa no checkout', () => {
    mockExecSync.mockReturnValue('' as never);

    const result = validatePatchFit({
      checkoutPath: '/repo/svn',
      patchContent: 'diff --git a/src/app.ts b/src/app.ts\n...'
    });

    expect(result.status).toBe('ready');
    expect(result.canApply).toBe(true);
    expect(result.message).toContain('Pronto para aplicação');
  });

  it('retorna incompatible quando patch não encaixa', () => {
    const err = Object.assign(new Error('patch failed'), { stderr: 'patch does not apply' });
    mockExecSync.mockImplementation(() => { throw err; });

    const result = validatePatchFit({
      checkoutPath: '/repo/svn',
      patchContent: 'diff ...'
    });

    expect(result.status).toBe('incompatible');
    expect(result.canApply).toBe(false);
    expect(result.errorCode).toBe('PATCH_DOES_NOT_APPLY');
    expect(result.message).toContain('não encaixa');
  });

  it('retorna incompatible quando patch já foi aplicado', () => {
    const err = Object.assign(new Error('already applied'), { stderr: 'already applied' });
    mockExecSync.mockImplementation(() => { throw err; });

    const result = validatePatchFit({
      checkoutPath: '/repo/svn',
      patchContent: 'diff ...'
    });

    expect(result.status).toBe('incompatible');
    expect(result.canApply).toBe(false);
    expect(result.errorCode).toBe('PATCH_DOES_NOT_APPLY');
  });

  it('retorna error quando ocorre falha inesperada no comando', () => {
    const err = Object.assign(new Error('git not found'), { stderr: '' });
    mockExecSync.mockImplementation(() => { throw err; });

    const result = validatePatchFit({
      checkoutPath: '/repo/svn',
      patchContent: 'diff ...'
    });

    expect(result.status).toBe('error');
    expect(result.canApply).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });

  it('grava arquivo temporário com conteúdo do patch', () => {
    mockExecSync.mockReturnValue('' as never);

    validatePatchFit({
      checkoutPath: '/repo/svn',
      patchContent: 'patch content here'
    });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('svnflow-patch-'),
      'patch content here',
      { encoding: 'utf-8' }
    );
  });

  it('remove arquivo temporário mesmo após falha', () => {
    const err = Object.assign(new Error('falha'), { stderr: 'patch failed' });
    mockExecSync.mockImplementation(() => { throw err; });

    validatePatchFit({ checkoutPath: '/repo/svn', patchContent: 'diff ...' });

    expect(mockUnlinkSync).toHaveBeenCalled();
  });

  it('não altera arquivos do checkout (usa --check)', () => {
    mockExecSync.mockReturnValue('' as never);

    validatePatchFit({ checkoutPath: '/repo/svn', patchContent: 'diff ...' });

    const callArgs = mockExecSync.mock.calls[0][0] as string;
    expect(callArgs).toContain('--check');
    expect(callArgs).not.toContain('git apply"');
  });
});
