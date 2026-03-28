export interface Provider {
  name: string;
  displayName: string;
  baseUrl: string;
  models: string[];
  docsUrl?: string;
}

const PROVIDERS: Provider[] = [
  {
    name: 'deepseek',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/anthropic',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    docsUrl: 'https://api-docs.deepseek.com/guides/anthropic_api',
  },
  {
    name: 'minimax',
    displayName: 'MiniMax',
    baseUrl: 'https://api.minimax.io/anthropic',
    models: ['MiniMax-M2.7'],
    docsUrl: 'https://platform.minimax.io/docs/token-plan/claude-code',
  },
  {
    name: 'moonshot',
    displayName: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    docsUrl: 'https://platform.moonshot.cn/docs',
  },
  {
    name: 'openrouter',
    displayName: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [], // Dynamic - depends on the model selected
    docsUrl: 'https://openrouter.ai/docs',
  },
  {
    name: 'groq',
    displayName: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    docsUrl: 'https://console.groq.com/docs',
  },
];

export function listProviders(): Provider[] {
  return PROVIDERS;
}

export function getProvider(name: string): Provider | null {
  return PROVIDERS.find(p => p.name === name) || null;
}

export function matchProvider(input: string): Provider | null {
  const lower = input.toLowerCase();
  return PROVIDERS.find(p =>
    p.name === lower ||
    p.displayName.toLowerCase() === lower ||
    p.displayName.toLowerCase().includes(lower) ||
    lower.includes(p.name)
  ) || null;
}
