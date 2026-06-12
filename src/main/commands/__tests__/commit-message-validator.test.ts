import { validateCommitMessage, suggestCommitMessage, type CommitMessageInput } from '../commit-message-validator';

describe('commit-message-validator', () => {
  describe('validateCommitMessage', () => {
    it('should reject empty title', () => {
      const result = validateCommitMessage({ title: '' });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('incomplete');
    });

    it('should reject title that is too short', () => {
      const result = validateCommitMessage({ title: 'Fix bug' });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('incomplete');
    });

    it('should reject title that is too long', () => {
      const result = validateCommitMessage({
        title: 'This is a very long title that exceeds the maximum character limit and should be rejected'
      });
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('incomplete');
    });

    it('should reject title that does not start with uppercase', () => {
      const result = validateCommitMessage({ title: 'fix bug in deployment.' });
      expect(result.isValid).toBe(false);
    });

    it('should reject title that does not end with punctuation', () => {
      const result = validateCommitMessage({ title: 'Fix deployment bug' });
      expect(result.isValid).toBe(false);
    });

    it('should accept valid title', () => {
      const result = validateCommitMessage({ title: 'Fix deployment bug.' });
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('valid');
    });

    it('should accept valid title with description', () => {
      const result = validateCommitMessage({
        title: 'Fix deployment bug.',
        description: 'Corrected the issue that prevented proper deployment.'
      });
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('valid');
    });

    it('should reject description that is too short', () => {
      const result = validateCommitMessage({
        title: 'Fix deployment bug.',
        description: 'Fixed it'
      });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INCOMPLETE_DESCRIPTION');
    });

    it('should reject description that is too long', () => {
      const result = validateCommitMessage({
        title: 'Fix deployment bug.',
        description: 'a'.repeat(501)
      });
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('DESCRIPTION_TOO_LONG');
    });

    it('should provide suggestions for improvement', () => {
      const result = validateCommitMessage({ title: 'fix bug' });
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('suggestCommitMessage', () => {
    it('should format simple title correctly', () => {
      const result = suggestCommitMessage({ title: 'fix deployment bug' });
      expect(result).toBe('Fix deployment bug.');
    });

    it('should preserve existing capitalization', () => {
      const result = suggestCommitMessage({ title: 'Fix deployment bug' });
      expect(result).toBe('Fix deployment bug.');
    });

    it('should add punctuation if missing', () => {
      const result = suggestCommitMessage({ title: 'Fix deployment bug' });
      expect(result).toMatch(/[.!?]$/);
    });
  });
});
