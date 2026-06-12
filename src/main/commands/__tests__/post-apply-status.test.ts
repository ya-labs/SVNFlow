import { readSvnStatus } from '../svn-status';
import { readPostApplyStatus } from '../post-apply-status';

jest.mock('../svn-status');

const mockReadSvnStatus = readSvnStatus as jest.MockedFunction<typeof readSvnStatus>;

const appliedResult = {
  status: 'applied' as const,
  applied: true,
  message: 'Patch aplicado com sucesso.',
  affectedFiles: ['src/app.ts', 'src/novo.ts']
};

describe('readPostApplyStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna ready-for-review quando patch foi aplicado e checkout está dirty sem conflitos', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'dirty',
      message: 'Checkout SVN possui alterações locais.',
      files: [
        { path: 'src/app.ts', status: 'modified', rawCode: 'M', description: 'Modificado localmente' }
      ],
      hasConflicts: false,
      hasUnexpectedChanges: false
    });

    const result = readPostApplyStatus({
      checkoutPath: '/repo/svn',
      applyResult: appliedResult
    });

    expect(result.reviewStatus).toBe('ready-for-review');
    expect(result.canAdvance).toBe(true);
    expect(result.appliedFiles).toEqual(['src/app.ts', 'src/novo.ts']);
    expect(result.checkoutState.status).toBe('dirty');
    expect(result.message).toContain('Revise as alterações');
  });

  it('retorna requires-correction quando há conflitos após aplicação', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'blocked',
      message: 'Checkout SVN possui conflitos.',
      files: [
        { path: 'src/conflito.ts', status: 'conflicted', rawCode: 'C', description: 'Em conflito' }
      ],
      hasConflicts: true,
      hasUnexpectedChanges: false
    });

    const result = readPostApplyStatus({
      checkoutPath: '/repo/svn',
      applyResult: appliedResult
    });

    expect(result.reviewStatus).toBe('requires-correction');
    expect(result.canAdvance).toBe(false);
    expect(result.message).toContain('Conflitos detectados');
  });

  it('retorna error quando aplicação não foi realizada', () => {
    const result = readPostApplyStatus({
      checkoutPath: '/repo/svn',
      applyResult: {
        status: 'error',
        applied: false,
        message: 'Falha na aplicação.',
        errorCode: 'APPLY_FAILED'
      }
    });

    expect(result.reviewStatus).toBe('error');
    expect(result.canAdvance).toBe(false);
    expect(mockReadSvnStatus).not.toHaveBeenCalled();
  });

  it('retorna requires-correction quando checkout está blocked após aplicação', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'blocked',
      message: 'Erro ao ler estado.',
      files: [],
      hasConflicts: false,
      hasUnexpectedChanges: false
    });

    const result = readPostApplyStatus({
      checkoutPath: '/repo/svn',
      applyResult: appliedResult
    });

    expect(result.reviewStatus).toBe('requires-correction');
    expect(result.canAdvance).toBe(false);
  });

  it('não executa commit SVN', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'dirty',
      message: 'Alterações locais.',
      files: [],
      hasConflicts: false,
      hasUnexpectedChanges: false
    });

    const result = readPostApplyStatus({
      checkoutPath: '/repo/svn',
      applyResult: appliedResult
    });

    expect(result.reviewStatus).not.toBe('committed');
    expect(result.canAdvance).toBe(true);
  });

  it('passa rawStatusOutput para readSvnStatus quando fornecido', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'clean',
      message: 'Limpo.',
      files: [],
      hasConflicts: false,
      hasUnexpectedChanges: false
    });

    readPostApplyStatus({
      checkoutPath: '/repo/svn',
      applyResult: appliedResult,
      rawStatusOutput: 'M src/app.ts'
    });

    expect(mockReadSvnStatus).toHaveBeenCalledWith({
      checkoutPath: '/repo/svn',
      rawOutput: 'M src/app.ts'
    });
  });
});
