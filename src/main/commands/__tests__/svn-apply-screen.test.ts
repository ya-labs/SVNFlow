import { readSvnStatus } from '../svn-status';
import { validatePatchFit } from '../patch-validator';
import { applyPatch } from '../patch-applier';
import { buildSvnApplyConfirmationScreen, executeSvnApply } from '../svn-apply-screen';

jest.mock('../svn-status');
jest.mock('../patch-validator');
jest.mock('../patch-applier');

const mockReadSvnStatus = readSvnStatus as jest.MockedFunction<typeof readSvnStatus>;
const mockValidatePatchFit = validatePatchFit as jest.MockedFunction<typeof validatePatchFit>;
const mockApplyPatch = applyPatch as jest.MockedFunction<typeof applyPatch>;

const cleanCheckout = {
  status: 'clean' as const,
  message: 'Checkout SVN sem alterações.',
  files: [],
  hasConflicts: false,
  hasUnexpectedChanges: false
};

const baseInput = {
  environmentName: 'Projeto SVN',
  svnCheckoutPath: '/repo/svn',
  svnCheckoutValidated: true,
  patchContent: 'diff ...',
  patchValidated: true,
  confirmed: false
};

describe('buildSvnApplyConfirmationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadSvnStatus.mockReturnValue(cleanCheckout);
  });

  it('exibe checkout SVN de destino e ambiente ativo', () => {
    const result = buildSvnApplyConfirmationScreen(baseInput);

    expect(result.environment.name).toBe('Projeto SVN');
    expect(result.environment.svnCheckoutPath).toBe('/repo/svn');
    expect(result.designSystemReference).toBe('YA_LABS');
    expect(result.visualProfile.reference).toBe('YA_LABS');
  });

  it('indica que é operação de aplicação, não commit', () => {
    const result = buildSvnApplyConfirmationScreen(baseInput);

    expect(result.isApplyOperation).toBe(true);
    expect(result.isCommitOperation).toBe(false);
  });

  it('retorna estado pronto quando checkout e patch estão validados', () => {
    const result = buildSvnApplyConfirmationScreen(baseInput);

    expect(result.status).toBe('ready');
    expect(result.canConfirm).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.messageStyles.confirmation.kind).toBe('success');
  });

  it('bloqueia quando checkout não foi validado', () => {
    const result = buildSvnApplyConfirmationScreen({
      ...baseInput,
      svnCheckoutValidated: false
    });

    expect(result.status).toBe('blocked');
    expect(result.canConfirm).toBe(false);
    expect(result.blockers.some((b) => b.code === 'CHECKOUT_NOT_VALIDATED')).toBe(true);
    expect(result.messageStyles.blocker.kind).toBe('blocked');
  });

  it('bloqueia quando patch não foi pré-validado', () => {
    const result = buildSvnApplyConfirmationScreen({
      ...baseInput,
      patchValidated: false
    });

    expect(result.status).toBe('blocked');
    expect(result.canConfirm).toBe(false);
    expect(result.blockers.some((b) => b.code === 'PATCH_NOT_VALIDATED')).toBe(true);
  });

  it('bloqueia quando há conflitos no checkout', () => {
    mockReadSvnStatus.mockReturnValue({
      ...cleanCheckout,
      status: 'blocked',
      hasConflicts: true,
      files: [
        { path: 'src/conflito.ts', status: 'conflicted', rawCode: 'C', description: 'Em conflito' }
      ]
    });

    const result = buildSvnApplyConfirmationScreen(baseInput);

    expect(result.status).toBe('blocked');
    expect(result.blockers.some((b) => b.code === 'CHECKOUT_HAS_CONFLICTS')).toBe(true);
  });

  it('adiciona aviso quando há alterações inesperadas sem conflito', () => {
    mockReadSvnStatus.mockReturnValue({
      ...cleanCheckout,
      status: 'dirty',
      hasUnexpectedChanges: true,
      files: [
        { path: 'src/arquivo.ts', status: 'missing', rawCode: '!', description: 'Ausente no disco' }
      ]
    });

    const result = buildSvnApplyConfirmationScreen(baseInput);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('alterações locais inesperadas');
    expect(result.messageStyles.warning.kind).toBe('warning');
  });

  it('lista arquivos que serão alterados a partir do estado do checkout', () => {
    mockReadSvnStatus.mockReturnValue({
      ...cleanCheckout,
      status: 'dirty',
      files: [
        { path: 'src/app.ts', status: 'modified', rawCode: 'M', description: 'Modificado' },
        { path: 'src/novo.ts', status: 'added', rawCode: 'A', description: 'Adicionado' }
      ]
    });

    const result = buildSvnApplyConfirmationScreen(baseInput);

    expect(result.filesToBeChanged).toEqual(['src/app.ts', 'src/novo.ts']);
  });
});

describe('executeSvnApply', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executa pré-validação e aplicação em sequência', () => {
    mockValidatePatchFit.mockReturnValue({
      status: 'ready',
      canApply: true,
      message: 'Patch compatível.'
    });

    mockApplyPatch.mockReturnValue({
      status: 'applied',
      applied: true,
      message: 'Patch aplicado.',
      affectedFiles: ['src/app.ts']
    });

    const result = executeSvnApply({ ...baseInput, confirmed: true });

    expect(result.patchValidation.canApply).toBe(true);
    expect(result.apply.applied).toBe(true);
  });

  it('repassa confirmação para applyPatch', () => {
    mockValidatePatchFit.mockReturnValue({
      status: 'ready',
      canApply: true,
      message: 'OK'
    });

    mockApplyPatch.mockReturnValue({
      status: 'blocked',
      applied: false,
      message: 'Não confirmado.',
      errorCode: 'NOT_CONFIRMED'
    });

    const result = executeSvnApply({ ...baseInput, confirmed: false });

    expect(mockApplyPatch).toHaveBeenCalledWith(
      expect.objectContaining({ confirmed: false })
    );
    expect(result.apply.applied).toBe(false);
  });
});
