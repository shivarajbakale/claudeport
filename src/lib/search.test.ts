import { extractEnvFromHtml } from './search';

describe('extractEnvFromHtml', () => {
  it('extracts env config from nested JSON', () => {
    const html = '<pre><code>{ "env": { "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic", "ANTHROPIC_AUTH_TOKEN": "&lt;KEY&gt;", "ANTHROPIC_MODEL": "deepseek-chat" } }</code></pre>';
    const result = extractEnvFromHtml(html);
    expect(result).not.toBeNull();
    expect(result!.env.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
  });
  it('extracts env from flat JSON', () => {
    const html = '<pre>{ "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic", "ANTHROPIC_AUTH_TOKEN": "&lt;KEY&gt;", "ANTHROPIC_MODEL": "MiniMax-M2.7" }</pre>';
    const result = extractEnvFromHtml(html);
    expect(result).not.toBeNull();
    expect(result!.env.ANTHROPIC_BASE_URL).toBe('https://api.minimax.io/anthropic');
  });
  it('returns null when no config found', () => { expect(extractEnvFromHtml('<p>No config here</p>')).toBeNull(); });
});
