import { isValidProfileName, maskApiKey, type Profile, type State, type ClaudeSettings } from './types';

describe('isValidProfileName', () => {
  it('accepts lowercase alphanumeric with hyphens and dots', () => {
    expect(isValidProfileName('deepseek')).toBe(true);
    expect(isValidProfileName('minimax-m27')).toBe(true);
    expect(isValidProfileName('ollama-local')).toBe(true);
    expect(isValidProfileName('minimax2.7')).toBe(true);
    expect(isValidProfileName('qwen3.5-plus')).toBe(true);
  });

  it('rejects invalid names', () => {
    expect(isValidProfileName('')).toBe(false);
    expect(isValidProfileName('Deep Seek')).toBe(false);
    expect(isValidProfileName('has_underscore')).toBe(false);
    expect(isValidProfileName('HAS-CAPS')).toBe(false);
    expect(isValidProfileName('../escape')).toBe(false);
    expect(isValidProfileName('a'.repeat(65))).toBe(false);
  });
});

describe('maskApiKey', () => {
  it('masks long keys showing last 4 chars', () => {
    expect(maskApiKey('sk-abc123xyz789')).toBe('••••••z789');
  });

  it('masks short keys', () => {
    expect(maskApiKey('abc')).toBe('••••');
    expect(maskApiKey('')).toBe('••••');
  });
});
