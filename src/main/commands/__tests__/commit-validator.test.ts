import { readSvnStatus } from '../svn-status';
import { validateCommitPreConditions } from '../commit-validator';

jest.mock('../svn-status');

const mockReadSvnStatus = readSvnStatus as jest.MockedFunction<typeof readSvnStatus>;

describe('validateCommitPreConditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna ready quando há alterações versionadas', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'dirty',
      message: 'Alterações detectadas',
      files: [
        {
          path: 'src/app.ts',
          status: 'modified',
          rawCode: 'M',
          description: 'Modificado localmente'
        }
      ],
      hasConflicts: false,
      hasUnexpectedChanges: false
    });

    const result = validateCommitPreConditions({
      checkoutPath: '/repo/svn'
    });

    expect(result.status).toBe('ready');
    expect(result.canCommit).toBe(true);
    expect(result.hasChanges).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.message).toContain('Pronto para commit');
  });

  it('retorna incompatible quando não há alterações', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'clean',
      message: 'Sem alterações',
      files: [],
      hasConflicts: false,
      hasUnexpectedChanges: false
    });

    const result = validateCommitPreConditions({
      checkoutPath: '/repo/svn'
    });

    expect(result.status).toBe('incompatible');
    expect(result.canCommit).toBe(false);
    expect(result.hasChanges).toBe(false);
    expect(result.errorCode).toBe('NO_CHANGES_TO_COMMIT');
    expect(result.blockers[0].code).toBe('NO_CHANGES_TO_COMMIT');
  });

  it('retorna incompatible quando há conflitos', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'dirty',
      message: 'Alterações com conflitos',
      files: [
        {
          path: 'src/app.ts',
          status: 'conflicted',
          rawCode: 'C',
          description: 'Em conflito'
        }
      ],
      hasConflicts: true,
      hasUnexpectedChanges: true
    });

    const result = validateCommitPreConditions({
      checkoutPath: '/repo/svn'
    });

    expect(result.status).toBe('incompatible');
    expect(result.canCommit).toBe(false);
    expect(result.blockers.some((b) => b.code === 'SVN_HAS_CONFLICTS')).toBe(true);
  });

  it('retorna incompatible quando há arquivos ausentes', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'dirty',
      message: 'Com arquivos ausentes',
      files: [
        {
          path: 'src/missing.ts',
          status: 'missing',
          rawCode: '!',
          description: 'Ausente no disco'
        },
        {
          path: 'src/app.ts',
          status: 'modified',
          rawCode: 'M',
          description: 'Modificado localmente'
        }
      ],
      hasConflicts: false,
      hasUnexpectedChanges: true
    });

    const result = validateCommitPreConditions({
      checkoutPath: '/repo/svn'
    });

    expect(result.status).toBe('incompatible');
    expect(result.canCommit).toBe(false);
    expect(result.blockers.some((b) => b.code === 'SVN_MISSING_FILES')).toBe(true);
  });

  it('retorna incompatible quando há arquivos não versionados', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'dirty',
      message: 'Com arquivos não versionados',
      files: [
        {
          path: 'src/unversioned.ts',
          status: 'unversioned',
          rawCode: '?',
          description: 'Não versionado'
        },
        {
          path: 'src/app.ts',
          status: 'modified',
          rawCode: 'M',
          description: 'Modificado localmente'
        }
      ],
      hasConflicts: false,
      hasUnexpectedChanges: false
    });

    const result = validateCommitPreConditions({
      checkoutPath: '/repo/svn'
    });

    expect(result.status).toBe('incompatible');
    expect(result.canCommit).toBe(false);
    expect(result.blockers.some((b) => b.code === 'SVN_UNVERSIONED_FILES_PRESENT')).toBe(true);
  });

  it('retorna incompatible quando checkout está bloqueado', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'blocked',
      message: 'Checkout inválido',
      files: [],
      hasConflicts: false,
      hasUnexpectedChanges: true
    });

    const result = validateCommitPreConditions({
      checkoutPath: '/repo/svn'
    });

    expect(result.status).toBe('incompatible');
    expect(result.canCommit).toBe(false);
    expect(result.blockers.some((b) => b.code === 'SVN_CHECKOUT_BLOCKED')).toBe(true);
  });

  it('retorna error quando readSvnStatus lança exceção', () => {
    mockReadSvnStatus.mockImplementation(() => {
      throw new Error('Falha ao ler status SVN');
    });

    const result = validateCommitPreConditions({
      checkoutPath: '/repo/svn'
    });

    expect(result.status).toBe('error');
    expect(result.canCommit).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
    expect(result.blockers[0].code).toBe('VALIDATION_FAILED');
  });

  it('conta múltiplas alterações na mensagem', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'dirty',
      message: 'Alterações',
      files: [
        {
          path: 'src/app.ts',
          status: 'modified',
          rawCode: 'M',
          description: 'Modificado'
        },
        {
          path: 'src/new.ts',
          status: 'added',
          rawCode: 'A',
          description: 'Adicionado'
        },
        {
          path: 'src/old.ts',
          status: 'deleted',
          rawCode: 'D',
          description: 'Removido'
        }
      ],
      hasConflicts: false,
      hasUnexpectedChanges: false
    });

    const result = validateCommitPreConditions({
      checkoutPath: '/repo/svn'
    });

    expect(result.status).toBe('ready');
    expect(result.message).toContain('3 arquivo(s) alterado(s)');
  });

  it('prioriza bloqueios quando há alterações e problemas', () => {
    mockReadSvnStatus.mockReturnValue({
      status: 'dirty',
      message: 'Com conflitos e alterações',
      files: [
        {
          path: 'src/conflict.ts',
          status: 'conflicted',
          rawCode: 'C',
          description: 'Em conflito'
        },
        {
          path: 'src/app.ts',
          status: 'modified',
          rawCode: 'M',
          description: 'Modificado'
        }
      ],
      hasConflicts: true,
      hasUnexpectedChanges: true
    });

    const result = validateCommitPreConditions({
      checkoutPath: '/repo/svn'
    });

    expect(result.status).toBe('incompatible');
    expect(result.canCommit).toBe(false);
    expect(result.hasChanges).toBe(true);
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
