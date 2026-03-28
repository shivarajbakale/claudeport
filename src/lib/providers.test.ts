import { listProviders, getProvider, matchProvider } from './providers';

describe('providers', () => {
  describe('listProviders', () => {
    it('returns all providers', () => {
      const providers = listProviders();
      expect(providers.length).toBeGreaterThan(0);
      const names = providers.map(p => p.name);
      expect(names).toContain('deepseek');
      expect(names).toContain('minimax');
      expect(names).toContain('moonshot');
      expect(names).toContain('openrouter');
      expect(names).toContain('groq');
    });

    it('each provider has required fields', () => {
      for (const p of listProviders()) {
        expect(typeof p.name).toBe('string');
        expect(typeof p.displayName).toBe('string');
        expect(typeof p.baseUrl).toBe('string');
        expect(Array.isArray(p.models)).toBe(true);
        expect(p.baseUrl).toContain('https://');
      }
    });
  });

  describe('getProvider', () => {
    it('finds provider by exact name', () => {
      const p = getProvider('deepseek');
      expect(p).not.toBeNull();
      expect(p!.baseUrl).toContain('deepseek');
    });

    it('returns null for unknown provider', () => {
      expect(getProvider('nonexistent')).toBeNull();
    });
  });

  describe('matchProvider', () => {
    it('matches by exact name', () => {
      expect(matchProvider('deepseek')).not.toBeNull();
    });

    it('matches by displayName', () => {
      expect(matchProvider('MiniMax')).not.toBeNull();
      expect(matchProvider('Kimi')).not.toBeNull();
    });

    it('matches partial name', () => {
      expect(matchProvider('minim')).not.toBeNull();
      expect(matchProvider('moon')).not.toBeNull();
    });

    it('is case insensitive', () => {
      expect(matchProvider('DEEPSEEK')).not.toBeNull();
      expect(matchProvider('Groq')).not.toBeNull();
    });

    it('returns null for no match', () => {
      expect(matchProvider('xyz123')).toBeNull();
    });
  });
});
