import type { SearchResult } from '../types';

export function extractEnvFromHtml(html: string): SearchResult | null {
  const decoded = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  const blocks = extractJsonBlocks(decoded);
  if (blocks.length === 0) return null;
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block);
      if (parsed.env && parsed.env.ANTHROPIC_BASE_URL) return { source: '', env: parsed.env, models: extractModels(parsed.env) };
      if (parsed.ANTHROPIC_BASE_URL) return { source: '', env: parsed, models: extractModels(parsed) };
    } catch { continue; }
  }
  return null;
}

function extractJsonBlocks(text: string): string[] {
  const results: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let depth = 0; let end = i;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '{') depth++;
      if (text[j] === '}') depth--;
      if (depth === 0) { end = j; break; }
    }
    if (depth === 0) {
      const block = text.slice(i, end + 1);
      if (block.includes('ANTHROPIC_BASE_URL')) results.push(block);
    }
  }
  return results;
}

function extractModels(env: Record<string, string>): string[] {
  const models = new Set<string>();
  for (const key of ['ANTHROPIC_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_OPUS_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL']) {
    if (env[key]) models.add(env[key]);
  }
  return [...models];
}

export async function searchProviderConfig(provider: string): Promise<SearchResult | null> {
  const queries = [`${provider} claude code ANTHROPIC_BASE_URL settings.json`, `${provider} anthropic compatible API endpoint`];
  for (const query of queries) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: { 'User-Agent': 'claude-switcher/1.0' } });
      const html = await response.text();
      const linkRegex = /href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/g;
      const links: string[] = []; let linkMatch;
      while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 3) links.push(decodeURIComponent(linkMatch[1]));
      for (const link of links) {
        try {
          const pageResponse = await fetch(link, { headers: { 'User-Agent': 'claude-switcher/1.0' }, signal: AbortSignal.timeout(10000) });
          const pageHtml = await pageResponse.text();
          const result = extractEnvFromHtml(pageHtml);
          if (result) { result.source = new URL(link).hostname; return result; }
        } catch { continue; }
      }
    } catch { continue; }
  }
  return null;
}
