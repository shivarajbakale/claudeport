export interface Profile {
  version: number;
  name: string;
  displayName: string;
  provider: string;
  env: Record<string, string>;
}

export interface State {
  version: number;
  activeProfile: string | null;
  lastSwitched: string | null;
  lastWrittenHash: string | null;
}

export interface ClaudeSettings {
  permissions?: {
    allow?: string[];
    additionalDirectories?: string[];
  };
  enabledPlugins?: Record<string, boolean>;
  env?: Record<string, string>;
  [key: string]: unknown;
}

export interface SearchResult {
  source: string;
  env: Record<string, string>;
  models: string[];
}

const PROFILE_NAME_REGEX = /^[a-z0-9][a-z0-9-]*$/;
const MAX_NAME_LENGTH = 64;

export function isValidProfileName(name: string): boolean {
  if (!name || name.length > MAX_NAME_LENGTH) return false;
  return PROFILE_NAME_REGEX.test(name);
}

export function maskApiKey(key: string): string {
  if (key.length <= 4) return '••••';
  return '••••••' + key.slice(-4);
}
