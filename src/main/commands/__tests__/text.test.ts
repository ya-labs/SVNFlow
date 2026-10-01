import { count, plural } from '../text';

describe('concordância de número', () => {
  it('usa o singular só para 1', () => {
    expect(count(1, 'arquivo', 'arquivos')).toBe('1 arquivo');
    expect(count(0, 'arquivo', 'arquivos')).toBe('0 arquivos');
    expect(count(3, 'alteração local', 'alterações locais')).toBe('3 alterações locais');
    expect(plural(1, 'fica', 'ficam')).toBe('fica');
    expect(plural(2, 'fica', 'ficam')).toBe('ficam');
  });
});
