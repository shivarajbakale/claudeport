# Claude Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a globally-installable CLI tool (`claude-switch`) that switches Claude Code between AI model providers by managing named profiles and merging env config into `~/.claude/settings.json`.

**Architecture:** ink (React for CLI) TUI with commander for arg parsing. Profile data stored as individual JSON files in `~/.claude-switcher/profiles/`. The tool snapshots the user's vanilla `settings.json` on first run and merges provider `env` blocks on top of it when switching. All lib modules are pure functions operating on typed data — ink components are thin wrappers.

**Tech Stack:** TypeScript, React, ink (TUI), commander (CLI parsing), chalk (colors), jest (testing)

**Spec:** `docs/superpowers/specs/2026-03-28-claude-switcher-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/types.ts` | All TypeScript interfaces: Profile, State, ClaudeSettings |
| `src/lib/profiles.ts` | CRUD operations for profile JSON files in `~/.claude-switcher/profiles/` |
| `src/lib/settings.ts` | Read/write/merge `~/.claude/settings.json`, base config snapshot, hash comparison |
| `src/lib/state.ts` | Read/write `~/.claude-switcher/state.json`, active profile tracking |
| `src/lib/search.ts` | Web search for provider docs, extract env config from pages |
| `src/lib/init.ts` | First-run initialization: create dirs, snapshot base config |
| `src/components/ProfileSelector.tsx` | Arrow-key selection menu with active indicator |
| `src/components/ProfileCard.tsx` | Display profile details in a box |
| `src/components/KeyInput.tsx` | Masked API key text input |
| `src/commands/switch.tsx` | Interactive menu + direct switch logic |
| `src/commands/add.tsx` | Add profile: search, prompt, save |
| `src/commands/list.tsx` | List all profiles, highlight active |
| `src/commands/current.tsx` | Show active profile details |
| `src/commands/reset.tsx` | Restore vanilla config |
| `src/commands/edit.tsx` | Edit existing profile |
| `src/commands/remove.tsx` | Remove profile (reset first if active) |
| `src/cli.tsx` | Entry point: commander program, route subcommands |
| `bin/claude-switch` | Shebang entry: `#!/usr/bin/env node` → `require('../dist/cli.js')` |

---

## Task 1: Project Setup — Dependencies & Config

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `bin/claude-switch`
- Create: `.gitignore` (update)

- [ ] **Step 1: Install dependencies**

```bash
npm install ink react ink-select-input ink-text-input ink-spinner chalk commander
npm install -D @types/react jest ts-jest @types/jest ts-node ts-node-dev
```

- [ ] **Step 2: Update package.json**

Update `package.json` to add the bin entry, update main, and configure jest:

```json
{
  "name": "claude-switcher",
  "version": "1.0.0",
  "description": "CLI tool to switch Claude Code between AI model providers",
  "main": "dist/cli.js",
  "bin": {
    "claude-switch": "./bin/claude-switch"
  },
  "scripts": {
    "start": "ts-node src/cli.tsx",
    "build": "tsc",
    "dev": "ts-node-dev --respawn src/cli.tsx",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "files": [
    "dist",
    "bin"
  ],
  "keywords": ["claude", "claude-code", "ai", "llm", "switcher", "cli"],
  "license": "MIT"
}
```

- [ ] **Step 3: Update tsconfig.json for JSX**

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 4: Create jest.config.js**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
```

- [ ] **Step 5: Create bin/claude-switch**

```bash
#!/usr/bin/env node
require('../dist/cli.js');
```

Make it executable: `chmod +x bin/claude-switch`

- [ ] **Step 6: Update .gitignore**

```
node_modules
dist
```

- [ ] **Step 7: Remove old src/index.ts and create placeholder**

Delete `src/index.ts` (the placeholder greeting function). Create a minimal `src/types.ts` placeholder so TypeScript has an input file:

```bash
rm src/index.ts
echo "export {};" > src/types.ts
```

- [ ] **Step 8: Verify build works**

```bash
npm run build
```

Expected: Compiles with no errors.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json jest.config.js bin/claude-switch .gitignore
git rm src/index.ts
git commit -m "chore: set up project with ink, commander, jest, and bin entry"
```

---

## Task 2: Types & Interfaces

**Files:**
- Create: `src/types.ts`
- Test: `src/types.test.ts`

- [ ] **Step 1: Write the type validation test**

```typescript
// src/types.test.ts
import { isValidProfileName, maskApiKey, type Profile, type State, type ClaudeSettings } from './types';

describe('isValidProfileName', () => {
  it('accepts lowercase alphanumeric with hyphens', () => {
    expect(isValidProfileName('deepseek')).toBe(true);
    expect(isValidProfileName('minimax-m27')).toBe(true);
    expect(isValidProfileName('ollama-local')).toBe(true);
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/types.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement types.ts**

```typescript
// src/types.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/types.test.ts
git commit -m "feat: add TypeScript interfaces and profile name validation"
```

---

## Task 3: Init Module — First-Run Setup

**Files:**
- Create: `src/lib/init.ts`
- Test: `src/lib/init.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/lib/init.test.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ensureInitialized } from './init';

describe('ensureInitialized', () => {
  let testHome: string;
  let originalHome: string;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-switcher-test-'));
    originalHome = process.env.HOME!;
    process.env.HOME = testHome;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('creates directories on first run', () => {
    ensureInitialized();
    expect(fs.existsSync(path.join(testHome, '.claude-switcher'))).toBe(true);
    expect(fs.existsSync(path.join(testHome, '.claude-switcher', 'profiles'))).toBe(true);
  });

  it('snapshots existing settings.json as base', () => {
    const claudeDir = path.join(testHome, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    const settings = { permissions: { allow: ['Bash(git status:*)'] } };
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(settings, null, 2));

    ensureInitialized();

    const base = JSON.parse(fs.readFileSync(path.join(testHome, '.claude-switcher', 'base-settings.json'), 'utf-8'));
    expect(base.permissions.allow).toContain('Bash(git status:*)');
  });

  it('creates empty base if no settings.json exists', () => {
    ensureInitialized();

    const base = JSON.parse(fs.readFileSync(path.join(testHome, '.claude-switcher', 'base-settings.json'), 'utf-8'));
    expect(base).toEqual({});
  });

  it('does not overwrite existing base on subsequent runs', () => {
    const switcherDir = path.join(testHome, '.claude-switcher');
    fs.mkdirSync(path.join(switcherDir, 'profiles'), { recursive: true });
    fs.writeFileSync(path.join(switcherDir, 'base-settings.json'), JSON.stringify({ existing: true }));

    ensureInitialized();

    const base = JSON.parse(fs.readFileSync(path.join(switcherDir, 'base-settings.json'), 'utf-8'));
    expect(base).toEqual({ existing: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/init.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement init.ts**

**IMPORTANT:** All paths are computed via functions (not module-level constants) so that tests can override `process.env.HOME` at runtime.

```typescript
// src/lib/init.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function switcherDir(): string {
  return path.join(os.homedir(), '.claude-switcher');
}

export function profilesDir(): string {
  return path.join(switcherDir(), 'profiles');
}

export function baseSettingsPath(): string {
  return path.join(switcherDir(), 'base-settings.json');
}

export function statePath(): string {
  return path.join(switcherDir(), 'state.json');
}

export function claudeSettingsPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

export function ensureInitialized(): void {
  // Create directories
  const profDir = profilesDir();
  if (!fs.existsSync(profDir)) {
    fs.mkdirSync(profDir, { recursive: true, mode: 0o700 });
  }

  // Snapshot base settings on first run
  const basePath = baseSettingsPath();
  if (!fs.existsSync(basePath)) {
    let baseSettings = {};
    const claudePath = claudeSettingsPath();
    if (fs.existsSync(claudePath)) {
      baseSettings = JSON.parse(fs.readFileSync(claudePath, 'utf-8'));
    }
    fs.writeFileSync(basePath, JSON.stringify(baseSettings, null, 2), { mode: 0o600 });
  }

  // Create state file if missing
  const stPath = statePath();
  if (!fs.existsSync(stPath)) {
    const initialState = {
      version: 1,
      activeProfile: null,
      lastSwitched: null,
      lastWrittenHash: null,
    };
    fs.writeFileSync(stPath, JSON.stringify(initialState, null, 2), { mode: 0o600 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/lib/init.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/init.ts src/lib/init.test.ts
git commit -m "feat: add init module for first-run directory and base config setup"
```

---

## Task 4: State Module

**Files:**
- Create: `src/lib/state.ts`
- Test: `src/lib/state.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/lib/state.test.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getState, setActiveProfile, clearActiveProfile } from './state';

describe('state', () => {
  let testHome: string;
  let originalHome: string;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-switcher-test-'));
    originalHome = process.env.HOME!;
    process.env.HOME = testHome;
    fs.mkdirSync(path.join(testHome, '.claude-switcher'), { recursive: true });
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('returns default state when file missing', () => {
    const state = getState();
    expect(state.activeProfile).toBeNull();
    expect(state.version).toBe(1);
  });

  it('sets active profile with timestamp and hash', () => {
    setActiveProfile('deepseek', 'sha256:abc');
    const state = getState();
    expect(state.activeProfile).toBe('deepseek');
    expect(state.lastWrittenHash).toBe('sha256:abc');
    expect(state.lastSwitched).toBeTruthy();
  });

  it('clears active profile', () => {
    setActiveProfile('deepseek', 'sha256:abc');
    clearActiveProfile();
    const state = getState();
    expect(state.activeProfile).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/state.test.ts
```

- [ ] **Step 3: Implement state.ts**

```typescript
// src/lib/state.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { State } from '../types';

function statePath(): string {
  return path.join(os.homedir(), '.claude-switcher', 'state.json');
}

const DEFAULT_STATE: State = {
  version: 1,
  activeProfile: null,
  lastSwitched: null,
  lastWrittenHash: null,
};

export function getState(): State {
  const p = statePath();
  if (!fs.existsSync(p)) return { ...DEFAULT_STATE };
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeState(state: State): void {
  fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), { mode: 0o600 });
}

export function setActiveProfile(name: string, hash: string): void {
  const state = getState();
  state.activeProfile = name;
  state.lastSwitched = new Date().toISOString();
  state.lastWrittenHash = hash;
  writeState(state);
}

export function clearActiveProfile(): void {
  const state = getState();
  state.activeProfile = null;
  state.lastSwitched = new Date().toISOString();
  state.lastWrittenHash = null;
  writeState(state);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/lib/state.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/state.ts src/lib/state.test.ts
git commit -m "feat: add state module for active profile tracking"
```

---

## Task 5: Profiles Module

**Files:**
- Create: `src/lib/profiles.ts`
- Test: `src/lib/profiles.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/lib/profiles.test.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { saveProfile, loadProfile, listProfiles, deleteProfile } from './profiles';
import type { Profile } from '../types';

describe('profiles', () => {
  let testHome: string;
  let originalHome: string;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-switcher-test-'));
    originalHome = process.env.HOME!;
    process.env.HOME = testHome;
    fs.mkdirSync(path.join(testHome, '.claude-switcher', 'profiles'), { recursive: true });
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  const testProfile: Profile = {
    version: 1,
    name: 'deepseek',
    displayName: 'DeepSeek V3.2',
    provider: 'deepseek',
    env: {
      ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'sk-test123',
      ANTHROPIC_MODEL: 'deepseek-chat',
    },
  };

  it('saves and loads a profile', () => {
    saveProfile(testProfile);
    const loaded = loadProfile('deepseek');
    expect(loaded).toEqual(testProfile);
  });

  it('returns null for non-existent profile', () => {
    expect(loadProfile('nonexistent')).toBeNull();
  });

  it('lists all profiles', () => {
    saveProfile(testProfile);
    saveProfile({ ...testProfile, name: 'minimax', displayName: 'MiniMax' });
    const profiles = listProfiles();
    expect(profiles).toHaveLength(2);
    expect(profiles.map(p => p.name).sort()).toEqual(['deepseek', 'minimax']);
  });

  it('deletes a profile', () => {
    saveProfile(testProfile);
    deleteProfile('deepseek');
    expect(loadProfile('deepseek')).toBeNull();
  });

  it('rejects invalid profile names', () => {
    expect(() => saveProfile({ ...testProfile, name: 'INVALID NAME' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/profiles.test.ts
```

- [ ] **Step 3: Implement profiles.ts**

```typescript
// src/lib/profiles.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Profile } from '../types';
import { isValidProfileName } from '../types';

function profilesDir(): string {
  return path.join(os.homedir(), '.claude-switcher', 'profiles');
}

function profilePath(name: string): string {
  return path.join(profilesDir(), `${name}.json`);
}

export function saveProfile(profile: Profile): void {
  if (!isValidProfileName(profile.name)) {
    throw new Error(`Invalid profile name: "${profile.name}". Use lowercase alphanumeric and hyphens only, max 64 chars.`);
  }
  fs.writeFileSync(profilePath(profile.name), JSON.stringify(profile, null, 2), { mode: 0o600 });
}

export function loadProfile(name: string): Profile | null {
  const p = profilePath(name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export function listProfiles(): Profile[] {
  const dir = profilesDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function deleteProfile(name: string): void {
  const p = profilePath(name);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

export function profileExists(name: string): boolean {
  return fs.existsSync(profilePath(name));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/lib/profiles.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/profiles.ts src/lib/profiles.test.ts
git commit -m "feat: add profiles module for CRUD on provider profiles"
```

---

## Task 6: Settings Module — Read/Write/Merge

**Files:**
- Create: `src/lib/settings.ts`
- Test: `src/lib/settings.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/lib/settings.test.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readBaseSettings, applyProfile, resetToBase, computeHash, detectManualEdits } from './settings';

describe('settings', () => {
  let testHome: string;
  let originalHome: string;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-switcher-test-'));
    originalHome = process.env.HOME!;
    process.env.HOME = testHome;
    fs.mkdirSync(path.join(testHome, '.claude-switcher', 'profiles'), { recursive: true });
    fs.mkdirSync(path.join(testHome, '.claude'), { recursive: true });
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  const baseSettings = {
    permissions: { allow: ['Bash(git status:*)'] },
    enabledPlugins: { 'superpowers@official': true },
  };

  const profileEnv = {
    ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
    ANTHROPIC_AUTH_TOKEN: 'sk-test',
    ANTHROPIC_MODEL: 'deepseek-chat',
  };

  it('applies profile env to base settings without clobbering other keys', () => {
    fs.writeFileSync(
      path.join(testHome, '.claude-switcher', 'base-settings.json'),
      JSON.stringify(baseSettings, null, 2)
    );

    applyProfile(profileEnv);

    const result = JSON.parse(fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8'));
    expect(result.permissions.allow).toContain('Bash(git status:*)');
    expect(result.enabledPlugins['superpowers@official']).toBe(true);
    expect(result.env.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
  });

  it('replaces env entirely on switch (no stale keys)', () => {
    fs.writeFileSync(
      path.join(testHome, '.claude-switcher', 'base-settings.json'),
      JSON.stringify(baseSettings, null, 2)
    );

    // First switch
    applyProfile({ ...profileEnv, EXTRA_KEY: 'stale' });
    // Second switch with different env
    applyProfile(profileEnv);

    const result = JSON.parse(fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8'));
    expect(result.env.EXTRA_KEY).toBeUndefined();
    expect(result.env.ANTHROPIC_MODEL).toBe('deepseek-chat');
  });

  it('resets to base (removes env key)', () => {
    fs.writeFileSync(
      path.join(testHome, '.claude-switcher', 'base-settings.json'),
      JSON.stringify(baseSettings, null, 2)
    );
    applyProfile(profileEnv);
    resetToBase();

    const result = JSON.parse(fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8'));
    expect(result.env).toBeUndefined();
    expect(result.permissions.allow).toContain('Bash(git status:*)');
  });

  it('detects manual edits via hash comparison', () => {
    fs.writeFileSync(
      path.join(testHome, '.claude-switcher', 'base-settings.json'),
      JSON.stringify(baseSettings, null, 2)
    );
    const hash = applyProfile(profileEnv);

    // No manual edit — should not detect changes
    expect(detectManualEdits(hash)).toBe(false);

    // Simulate manual edit
    const settingsPath = path.join(testHome, '.claude', 'settings.json');
    const current = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    current.newKey = 'manually added';
    fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2));

    expect(detectManualEdits(hash)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/settings.test.ts
```

- [ ] **Step 3: Implement settings.ts**

```typescript
// src/lib/settings.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import type { ClaudeSettings } from '../types';

function basePath(): string {
  return path.join(os.homedir(), '.claude-switcher', 'base-settings.json');
}

function claudeSettingsPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

export function readBaseSettings(): ClaudeSettings {
  return JSON.parse(fs.readFileSync(basePath(), 'utf-8'));
}

export function computeHash(content: string): string {
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

export function applyProfile(env: Record<string, string>): string {
  const base = readBaseSettings();
  const merged: ClaudeSettings = { ...base, env };
  const content = JSON.stringify(merged, null, 2);

  const settingsDir = path.dirname(claudeSettingsPath());
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  fs.writeFileSync(claudeSettingsPath(), content);

  return computeHash(content);
}

export function resetToBase(): void {
  const base = readBaseSettings();
  const settingsDir = path.dirname(claudeSettingsPath());
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  fs.writeFileSync(claudeSettingsPath(), JSON.stringify(base, null, 2));
}

export function detectManualEdits(lastHash: string | null): boolean {
  if (!lastHash) return false;
  const p = claudeSettingsPath();
  if (!fs.existsSync(p)) return true;
  const currentContent = fs.readFileSync(p, 'utf-8');
  return computeHash(currentContent) !== lastHash;
}

export function refreshBase(): void {
  const current = fs.existsSync(claudeSettingsPath())
    ? fs.readFileSync(claudeSettingsPath(), 'utf-8')
    : '{}';
  fs.writeFileSync(basePath(), current, { mode: 0o600 });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/lib/settings.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings.ts src/lib/settings.test.ts
git commit -m "feat: add settings module for read/write/merge of Claude settings"
```

---

## Task 7: Search Module — Web Search & Config Extraction

**Files:**
- Create: `src/lib/search.ts`
- Test: `src/lib/search.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/lib/search.test.ts
import { extractEnvFromHtml } from './search';

describe('extractEnvFromHtml', () => {
  it('extracts env config from HTML containing JSON code block', () => {
    const html = `
      <p>Configure your settings:</p>
      <pre><code>{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "&lt;DEEPSEEK_API_KEY&gt;",
    "ANTHROPIC_MODEL": "deepseek-chat"
  }
}</code></pre>
    `;
    const result = extractEnvFromHtml(html);
    expect(result).not.toBeNull();
    expect(result!.env.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
    expect(result!.env.ANTHROPIC_MODEL).toBe('deepseek-chat');
  });

  it('extracts env from flat JSON block with ANTHROPIC_BASE_URL', () => {
    const html = `
      <pre>{
    "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "&lt;KEY&gt;",
    "ANTHROPIC_MODEL": "MiniMax-M2.7"
}</pre>
    `;
    const result = extractEnvFromHtml(html);
    expect(result).not.toBeNull();
    expect(result!.env.ANTHROPIC_BASE_URL).toBe('https://api.minimax.io/anthropic');
  });

  it('returns null when no config found', () => {
    const html = '<p>No config here</p>';
    expect(extractEnvFromHtml(html)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/search.test.ts
```

- [ ] **Step 3: Implement search.ts**

```typescript
// src/lib/search.ts
import type { SearchResult } from '../types';

export function extractEnvFromHtml(html: string): SearchResult | null {
  // Decode HTML entities
  const decoded = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');

  // Extract JSON blocks by finding balanced braces containing ANTHROPIC_BASE_URL
  const blocks = extractJsonBlocks(decoded);

  if (blocks.length === 0) return null;

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block);

      // Check if it's a nested { env: { ... } } structure
      if (parsed.env && parsed.env.ANTHROPIC_BASE_URL) {
        return {
          source: '',
          env: parsed.env,
          models: extractModels(parsed.env),
        };
      }

      // Check if it's a flat env object
      if (parsed.ANTHROPIC_BASE_URL) {
        return {
          source: '',
          env: parsed,
          models: extractModels(parsed),
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractJsonBlocks(text: string): string[] {
  const results: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let depth = 0;
    let end = i;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '{') depth++;
      if (text[j] === '}') depth--;
      if (depth === 0) { end = j; break; }
    }
    if (depth === 0) {
      const block = text.slice(i, end + 1);
      if (block.includes('ANTHROPIC_BASE_URL')) {
        results.push(block);
      }
    }
  }
  return results;
}

function extractModels(env: Record<string, string>): string[] {
  const models = new Set<string>();
  const modelKeys = ['ANTHROPIC_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_OPUS_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL'];
  for (const key of modelKeys) {
    if (env[key]) models.add(env[key]);
  }
  return [...models];
}

export async function searchProviderConfig(provider: string): Promise<SearchResult | null> {
  const queries = [
    `${provider} claude code ANTHROPIC_BASE_URL settings.json`,
    `${provider} anthropic compatible API endpoint`,
  ];

  for (const query of queries) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'claude-switcher/1.0' },
      });
      const html = await response.text();

      // Extract result URLs from DuckDuckGo HTML
      const linkRegex = /href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/g;
      const links: string[] = [];
      let linkMatch;
      while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 3) {
        links.push(decodeURIComponent(linkMatch[1]));
      }

      // Fetch each result and try to extract config
      for (const link of links) {
        try {
          const pageResponse = await fetch(link, {
            headers: { 'User-Agent': 'claude-switcher/1.0' },
            signal: AbortSignal.timeout(10000),
          });
          const pageHtml = await pageResponse.text();
          const result = extractEnvFromHtml(pageHtml);
          if (result) {
            result.source = new URL(link).hostname;
            return result;
          }
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/lib/search.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/search.ts src/lib/search.test.ts
git commit -m "feat: add search module for web-based provider config discovery"
```

---

## Task 8: Ink Components

**Files:**
- Create: `src/components/ProfileSelector.tsx`
- Create: `src/components/ProfileCard.tsx`
- Create: `src/components/KeyInput.tsx`

These are thin UI wrappers — tested via integration through commands. No unit tests for components.

- [ ] **Step 1: Create ProfileSelector.tsx**

```tsx
// src/components/ProfileSelector.tsx
import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { Profile } from '../types';

interface Props {
  profiles: Profile[];
  activeProfile: string | null;
  onSelect: (name: string) => void;
}

export function ProfileSelector({ profiles, activeProfile, onSelect }: Props) {
  const items = [
    ...profiles.map(p => ({
      label: `${p.name === activeProfile ? '● ' : '○ '}${p.displayName}${p.name === activeProfile ? '  (active)' : ''}`,
      value: p.name,
    })),
    {
      label: `${activeProfile === null ? '● ' : '○ '}Default Claude  (vanilla)`,
      value: '__reset__',
    },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Claude Switcher</Text>
      <Text>{'\n'}Select a provider:{'\n'}</Text>
      <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
      <Text dimColor>{'\n'}↑↓ Navigate  ⏎ Select  q Quit</Text>
    </Box>
  );
}
```

- [ ] **Step 2: Create ProfileCard.tsx**

```tsx
// src/components/ProfileCard.tsx
import React from 'react';
import { Box, Text } from 'ink';
import type { Profile } from '../types';
import { maskApiKey } from '../types';

interface Props {
  profile: Profile;
  isActive?: boolean;
}

export function ProfileCard({ profile, isActive }: Props) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isActive ? 'green' : 'gray'} padding={1}>
      <Text bold>{profile.displayName} {isActive && <Text color="green">(active)</Text>}</Text>
      <Text>Base URL: <Text color="cyan">{profile.env.ANTHROPIC_BASE_URL}</Text></Text>
      <Text>Model:    <Text color="yellow">{profile.env.ANTHROPIC_MODEL}</Text></Text>
      <Text>API Key:  <Text dimColor>{maskApiKey(profile.env.ANTHROPIC_AUTH_TOKEN || '')}</Text></Text>
    </Box>
  );
}
```

- [ ] **Step 3: Create KeyInput.tsx**

```tsx
// src/components/KeyInput.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface Props {
  label: string;
  onSubmit: (value: string) => void;
}

export function KeyInput({ label, onSubmit }: Props) {
  const [value, setValue] = useState('');

  return (
    <Box>
      <Text>{label} </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={onSubmit}
        mask="•"
      />
    </Box>
  );
}
```

- [ ] **Step 4: Verify build compiles**

```bash
npm run build
```

Expected: Compiles with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: add ink components — ProfileSelector, ProfileCard, KeyInput"
```

---

## Task 9: Switch Command

**Files:**
- Create: `src/commands/switch.tsx`

- [ ] **Step 1: Implement switch.tsx**

```tsx
// src/commands/switch.tsx
import React, { useEffect, useState } from 'react';
import { render, Box, Text } from 'ink';
import { ProfileSelector } from '../components/ProfileSelector';
import { ProfileCard } from '../components/ProfileCard';
import { listProfiles, loadProfile } from '../lib/profiles';
import { applyProfile, resetToBase, detectManualEdits } from '../lib/settings';
import { getState, setActiveProfile, clearActiveProfile } from '../lib/state';
import { ensureInitialized } from '../lib/init';
import chalk from 'chalk';

function SwitchApp() {
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  const profiles = listProfiles();
  const state = getState();

  if (profiles.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">No profiles found. Run <Text bold>claude-switch add</Text> to create one.</Text>
      </Box>
    );
  }

  if (done) {
    return (
      <Box padding={1}>
        <Text>{message}</Text>
      </Box>
    );
  }

  const handleSelect = (name: string) => {
    // Check for manual edits before switching
    if (detectManualEdits(state.lastWrittenHash)) {
      console.warn(chalk.yellow('⚠') + ' settings.json has been manually edited since last switch.');
    }

    if (name === '__reset__') {
      resetToBase();
      clearActiveProfile();
      setMessage(chalk.green('✓') + ' Restored vanilla Claude configuration.');
    } else {
      const profile = loadProfile(name);
      if (!profile) {
        setMessage(chalk.red('✗') + ` Profile "${name}" not found.`);
      } else if (!profile.env.ANTHROPIC_BASE_URL) {
        setMessage(chalk.red('✗') + ` Profile "${name}" missing ANTHROPIC_BASE_URL.`);
      } else if (profile.env.ANTHROPIC_AUTH_TOKEN === '<YOUR_API_KEY>') {
        setMessage(chalk.red('✗') + ` Profile "${name}" has a placeholder API key. Run claude-switch edit ${name} to set it.`);
      } else {
        const hash = applyProfile(profile.env);
        setActiveProfile(name, hash);
        setMessage(chalk.green('✓') + ` Switched to ${profile.displayName}.`);
      }
    }
    setDone(true);
  };

  return <ProfileSelector profiles={profiles} activeProfile={state.activeProfile} onSelect={handleSelect} />;
}

export function runInteractiveSwitch(): void {
  ensureInitialized();
  render(<SwitchApp />);
}

export function runDirectSwitch(name: string): void {
  ensureInitialized();
  const profile = loadProfile(name);
  if (!profile) {
    console.error(chalk.red('✗') + ` Profile "${name}" not found. Run ${chalk.bold('claude-switch list')} to see available profiles.`);
    process.exit(1);
  }

  if (!profile.env.ANTHROPIC_BASE_URL) {
    console.error(chalk.red('✗') + ` Profile "${name}" is missing ANTHROPIC_BASE_URL.`);
    process.exit(1);
  }

  if (profile.env.ANTHROPIC_AUTH_TOKEN === '<YOUR_API_KEY>') {
    console.error(chalk.red('✗') + ` Profile "${name}" has a placeholder API key. Run ${chalk.bold(`claude-switch edit ${name}`)} to set it.`);
    process.exit(1);
  }

  const state = getState();
  if (detectManualEdits(state.lastWrittenHash)) {
    console.warn(chalk.yellow('⚠') + ' settings.json has been manually edited since last switch.');
  }

  const hash = applyProfile(profile.env);
  setActiveProfile(name, hash);
  console.log(chalk.green('✓') + ` Switched to ${profile.displayName}.`);
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/switch.tsx
git commit -m "feat: add switch command — interactive menu and direct switch"
```

---

## Task 10: List, Current, Reset Commands

**Files:**
- Create: `src/commands/list.tsx`
- Create: `src/commands/current.tsx`
- Create: `src/commands/reset.tsx`

- [ ] **Step 1: Implement list.tsx**

```tsx
// src/commands/list.tsx
import React from 'react';
import { render, Box, Text } from 'ink';
import { listProfiles } from '../lib/profiles';
import { getState } from '../lib/state';
import { ensureInitialized } from '../lib/init';
import { maskApiKey } from '../types';
import chalk from 'chalk';

function ListApp() {
  const profiles = listProfiles();
  const state = getState();

  if (profiles.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">No profiles found. Run <Text bold>claude-switch add</Text> to create one.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Profiles:{'\n'}</Text>
      {profiles.map(p => (
        <Text key={p.name}>
          {p.name === state.activeProfile ? chalk.green('● ') : '○ '}
          <Text bold>{p.displayName}</Text>
          <Text dimColor> ({p.name})</Text>
          <Text dimColor> — {p.env.ANTHROPIC_BASE_URL}</Text>
          {p.name === state.activeProfile && <Text color="green"> (active)</Text>}
        </Text>
      ))}
    </Box>
  );
}

export function runList(): void {
  ensureInitialized();
  render(<ListApp />);
}
```

- [ ] **Step 2: Implement current.tsx**

```tsx
// src/commands/current.tsx
import React from 'react';
import { render, Box, Text } from 'ink';
import { loadProfile } from '../lib/profiles';
import { getState } from '../lib/state';
import { ProfileCard } from '../components/ProfileCard';
import { ensureInitialized } from '../lib/init';

function CurrentApp() {
  const state = getState();

  if (!state.activeProfile) {
    return (
      <Box padding={1}>
        <Text color="cyan">Using default Claude configuration (vanilla).</Text>
      </Box>
    );
  }

  const profile = loadProfile(state.activeProfile);
  if (!profile) {
    return (
      <Box padding={1}>
        <Text color="red">Active profile "{state.activeProfile}" not found. Run <Text bold>claude-switch reset</Text>.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <ProfileCard profile={profile} isActive={true} />
      {state.lastSwitched && (
        <Text dimColor>{'\n'}Switched at: {new Date(state.lastSwitched).toLocaleString()}</Text>
      )}
    </Box>
  );
}

export function runCurrent(): void {
  ensureInitialized();
  render(<CurrentApp />);
}
```

- [ ] **Step 3: Implement reset.tsx**

```tsx
// src/commands/reset.tsx
import { resetToBase } from '../lib/settings';
import { clearActiveProfile } from '../lib/state';
import { ensureInitialized } from '../lib/init';
import chalk from 'chalk';

export function runReset(): void {
  ensureInitialized();
  resetToBase();
  clearActiveProfile();
  console.log(chalk.green('✓') + ' Restored vanilla Claude configuration. Env block removed from settings.json.');
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/commands/list.tsx src/commands/current.tsx src/commands/reset.tsx
git commit -m "feat: add list, current, and reset commands"
```

---

## Task 11: Add Command

**Files:**
- Create: `src/commands/add.tsx`

- [ ] **Step 1: Implement add.tsx**

```tsx
// src/commands/add.tsx
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { KeyInput } from '../components/KeyInput';
import { ProfileCard } from '../components/ProfileCard';
import { saveProfile, profileExists } from '../lib/profiles';
import { applyProfile } from '../lib/settings';
import { setActiveProfile } from '../lib/state';
import { ensureInitialized } from '../lib/init';
import { searchProviderConfig } from '../lib/search';
import { isValidProfileName } from '../types';
import type { Profile, SearchResult } from '../types';

type Step = 'name-prompt' | 'searching' | 'confirm' | 'manual-url' | 'manual-model' | 'manual-timeout' | 'select-model' | 'api-key' | 'overwrite' | 'switch-now' | 'done';

function AddApp({ initialName }: { initialName?: string }) {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>(initialName ? 'searching' : 'name-prompt');
  const [name, setName] = useState(initialName || '');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (step === 'searching' && name) {
      searchProviderConfig(name).then(result => {
        if (result) {
          setSearchResult(result);
          setEnv(result.env);
          setStep('confirm');
        } else {
          setStep('manual-url');
        }
      });
    }
  }, []);

  if (step === 'name-prompt') {
    return (
      <Box padding={1}>
        <Text>Profile name (lowercase, hyphens ok): </Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(val) => {
            if (!isValidProfileName(val)) {
              setMessage('Invalid name. Use lowercase alphanumeric and hyphens, max 64 chars.');
              setStep('done');
              return;
            }
            setName(val);
            setInputValue('');
            setStep('searching');
          }}
        />
      </Box>
    );
  }

  if (step === 'searching') {
    return (
      <Box padding={1}>
        <Text><Spinner type="dots" /> Searching for {name} Claude Code configuration...</Text>
      </Box>
    );
  }

  if (step === 'confirm' && searchResult) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green">✓ Found configuration from {searchResult.source}{'\n'}</Text>
        <Text>Base URL: <Text color="cyan">{env.ANTHROPIC_BASE_URL}</Text></Text>
        <Text>Models:   <Text color="yellow">{searchResult.models.join(', ')}</Text></Text>
        <Text>{'\n'}Use this configuration?</Text>
        <SelectInput
          items={[
            { label: 'Yes', value: 'yes' },
            { label: 'No, enter manually', value: 'no' },
          ]}
          onSelect={(item) => {
            if (item.value === 'yes') {
              if (searchResult.models.length > 1) {
                setStep('select-model');
              } else {
                setStep('api-key');
              }
            } else {
              setStep('manual-url');
            }
          }}
        />
      </Box>
    );
  }

  if (step === 'manual-url') {
    return (
      <Box padding={1}>
        <Text>Enter the Anthropic-compatible base URL: </Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(url) => {
            setEnv(prev => ({ ...prev, ANTHROPIC_BASE_URL: url }));
            setInputValue('');
            setStep('manual-model');
          }}
        />
      </Box>
    );
  }

  if (step === 'manual-model') {
    return (
      <Box padding={1}>
        <Text>Enter the model name: </Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(model) => {
            setEnv(prev => ({
              ...prev,
              ANTHROPIC_MODEL: model,
              ANTHROPIC_DEFAULT_SONNET_MODEL: model,
              ANTHROPIC_DEFAULT_OPUS_MODEL: model,
              ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
            }));
            setInputValue('');
            setStep('manual-timeout');
          }}
        />
      </Box>
    );
  }

  if (step === 'manual-timeout') {
    return (
      <Box padding={1}>
        <Text>Custom timeout in ms? (default: 3000000): </Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={(timeout) => {
            const t = timeout || '3000000';
            setEnv(prev => ({
              ...prev,
              API_TIMEOUT_MS: t,
              CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
            }));
            setInputValue('');
            setStep('api-key');
          }}
        />
      </Box>
    );
  }

  if (step === 'select-model' && searchResult) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Select default model:{'\n'}</Text>
        <SelectInput
          items={searchResult.models.map(m => ({ label: m, value: m }))}
          onSelect={(item) => {
            setEnv(prev => ({
              ...prev,
              ANTHROPIC_MODEL: item.value,
              ANTHROPIC_DEFAULT_SONNET_MODEL: item.value,
              ANTHROPIC_DEFAULT_OPUS_MODEL: item.value,
              ANTHROPIC_DEFAULT_HAIKU_MODEL: item.value,
            }));
            setStep('api-key');
          }}
        />
      </Box>
    );
  }

  if (step === 'api-key') {
    return (
      <Box padding={1}>
        <KeyInput
          label="Enter your API key:"
          onSubmit={(key) => {
            setEnv(prev => ({ ...prev, ANTHROPIC_AUTH_TOKEN: key || '<YOUR_API_KEY>' }));

            if (profileExists(name)) {
              setStep('overwrite');
            } else {
              doSave(key || '<YOUR_API_KEY>');
            }
          }}
        />
      </Box>
    );
  }

  if (step === 'overwrite') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Profile "{name}" already exists. Overwrite?</Text>
        <SelectInput
          items={[
            { label: 'Yes, overwrite', value: 'yes' },
            { label: 'Cancel', value: 'no' },
          ]}
          onSelect={(item) => {
            if (item.value === 'yes') {
              doSave(env.ANTHROPIC_AUTH_TOKEN);
            } else {
              setMessage('Cancelled.');
              setStep('done');
            }
          }}
        />
      </Box>
    );
  }

  if (step === 'switch-now') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green">✓ Profile "{name}" saved!{'\n'}</Text>
        <Text>Switch to it now?</Text>
        <SelectInput
          items={[
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ]}
          onSelect={(item) => {
            if (item.value === 'yes') {
              const hash = applyProfile(env);
              setActiveProfile(name, hash);
              setMessage(`✓ Switched to ${name}.`);
            } else {
              setMessage('Profile saved. Switch later with: claude-switch ' + name);
            }
            setStep('done');
          }}
        />
      </Box>
    );
  }

  if (step === 'done') {
    setTimeout(() => exit(), 100);
    return (
      <Box padding={1}>
        <Text>{message}</Text>
      </Box>
    );
  }

  return null;

  function doSave(apiKey: string) {
    const profile: Profile = {
      version: 1,
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      provider: name,
      env: { ...env, ANTHROPIC_AUTH_TOKEN: apiKey },
    };
    saveProfile(profile);
    setStep('switch-now');
  }
}

export function runAdd(name?: string): void {
  ensureInitialized();

  if (name && !isValidProfileName(name)) {
    console.error(`Invalid profile name: "${name}". Use lowercase alphanumeric and hyphens only, max 64 chars.`);
    process.exit(1);
  }

  render(<AddApp initialName={name} />);
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/add.tsx
git commit -m "feat: add 'add' command with web search and manual config flow"
```

---

## Task 12: Edit & Remove Commands

**Files:**
- Create: `src/commands/edit.tsx`
- Create: `src/commands/remove.tsx`

- [ ] **Step 1: Implement edit.tsx**

```tsx
// src/commands/edit.tsx
import React, { useState } from 'react';
import { render, Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { KeyInput } from '../components/KeyInput';
import { ProfileCard } from '../components/ProfileCard';
import { loadProfile, saveProfile } from '../lib/profiles';
import { ensureInitialized } from '../lib/init';
import chalk from 'chalk';
import type { Profile } from '../types';

type EditField = 'menu' | 'base-url' | 'model' | 'api-key' | 'display-name' | 'done';

function EditApp({ name }: { name: string }) {
  const { exit } = useApp();
  const [profile, setProfile] = useState<Profile | null>(loadProfile(name));
  const [step, setStep] = useState<EditField>('menu');
  const [inputValue, setInputValue] = useState('');

  if (!profile) {
    setTimeout(() => exit(), 100);
    return <Text color="red">Profile "{name}" not found.</Text>;
  }

  if (step === 'done') {
    setTimeout(() => exit(), 100);
    return <Text color="green">✓ Profile "{name}" updated.</Text>;
  }

  if (step === 'menu') {
    return (
      <Box flexDirection="column" padding={1}>
        <ProfileCard profile={profile} />
        <Text>{'\n'}What would you like to edit?{'\n'}</Text>
        <SelectInput
          items={[
            { label: 'Display Name', value: 'display-name' },
            { label: 'Base URL', value: 'base-url' },
            { label: 'Model', value: 'model' },
            { label: 'API Key', value: 'api-key' },
            { label: 'Done', value: 'done' },
          ]}
          onSelect={(item) => setStep(item.value as EditField)}
        />
      </Box>
    );
  }

  if (step === 'display-name') {
    return (
      <Box padding={1}>
        <Text>Display name ({profile.displayName}): </Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => {
          if (val) {
            const updated = { ...profile, displayName: val };
            saveProfile(updated);
            setProfile(updated);
          }
          setInputValue('');
          setStep('menu');
        }} />
      </Box>
    );
  }

  if (step === 'base-url') {
    return (
      <Box padding={1}>
        <Text>Base URL ({profile.env.ANTHROPIC_BASE_URL}): </Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => {
          if (val) {
            const updated = { ...profile, env: { ...profile.env, ANTHROPIC_BASE_URL: val } };
            saveProfile(updated);
            setProfile(updated);
          }
          setInputValue('');
          setStep('menu');
        }} />
      </Box>
    );
  }

  if (step === 'model') {
    return (
      <Box padding={1}>
        <Text>Model ({profile.env.ANTHROPIC_MODEL}): </Text>
        <TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => {
          if (val) {
            const updated = {
              ...profile,
              env: {
                ...profile.env,
                ANTHROPIC_MODEL: val,
                ANTHROPIC_DEFAULT_SONNET_MODEL: val,
                ANTHROPIC_DEFAULT_OPUS_MODEL: val,
                ANTHROPIC_DEFAULT_HAIKU_MODEL: val,
              },
            };
            saveProfile(updated);
            setProfile(updated);
          }
          setInputValue('');
          setStep('menu');
        }} />
      </Box>
    );
  }

  if (step === 'api-key') {
    return (
      <Box padding={1}>
        <KeyInput label="New API key:" onSubmit={(val) => {
          if (val) {
            const updated = { ...profile, env: { ...profile.env, ANTHROPIC_AUTH_TOKEN: val } };
            saveProfile(updated);
            setProfile(updated);
          }
          setStep('menu');
        }} />
      </Box>
    );
  }

  return null;
}

export function runEdit(name: string): void {
  ensureInitialized();
  render(<EditApp name={name} />);
}
```

- [ ] **Step 2: Implement remove.tsx**

```tsx
// src/commands/remove.tsx
import { loadProfile, deleteProfile } from '../lib/profiles';
import { getState, clearActiveProfile } from '../lib/state';
import { resetToBase } from '../lib/settings';
import { ensureInitialized } from '../lib/init';
import chalk from 'chalk';

export function runRemove(name: string): void {
  ensureInitialized();

  const profile = loadProfile(name);
  if (!profile) {
    console.error(chalk.red('✗') + ` Profile "${name}" not found.`);
    process.exit(1);
  }

  const state = getState();
  if (state.activeProfile === name) {
    resetToBase();
    clearActiveProfile();
    console.log(chalk.yellow('⚠') + ` "${name}" was the active profile. Reset to vanilla Claude config.`);
  }

  deleteProfile(name);
  console.log(chalk.green('✓') + ` Profile "${name}" removed.`);
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/commands/edit.tsx src/commands/remove.tsx
git commit -m "feat: add edit and remove commands"
```

---

## Task 13: CLI Entry Point

**Files:**
- Create: `src/cli.tsx`

- [ ] **Step 1: Implement cli.tsx**

```tsx
// src/cli.tsx
import { Command } from 'commander';
import { runInteractiveSwitch, runDirectSwitch } from './commands/switch';
import { runAdd } from './commands/add';
import { runList } from './commands/list';
import { runCurrent } from './commands/current';
import { runReset } from './commands/reset';
import { runEdit } from './commands/edit';
import { runRemove } from './commands/remove';
import { getState } from './lib/state';
import { refreshBase } from './lib/settings';
import { ensureInitialized } from './lib/init';
import chalk from 'chalk';

const pkg = require('../package.json');

const program = new Command();

program
  .name('claude-switch')
  .description('Switch Claude Code between AI model providers')
  .version(pkg.version)
  .argument('[name]', 'Profile name to switch to directly')
  .action((name?: string) => {
    if (name) {
      runDirectSwitch(name);
    } else {
      runInteractiveSwitch();
    }
  });

program
  .command('add [name]')
  .description('Add a new provider profile')
  .action((name?: string) => {
    runAdd(name);
  });

program
  .command('list')
  .description('List all provider profiles')
  .action(() => {
    runList();
  });

program
  .command('current')
  .description('Show the currently active provider')
  .action(() => {
    runCurrent();
  });

program
  .command('reset')
  .description('Restore vanilla Claude configuration')
  .action(() => {
    runReset();
  });

program
  .command('edit <name>')
  .description('Edit an existing profile')
  .action((name: string) => {
    runEdit(name);
  });

program
  .command('remove <name>')
  .description('Remove a provider profile')
  .action((name: string) => {
    runRemove(name);
  });

program
  .command('refresh-base')
  .description('Re-snapshot current settings as the vanilla base config')
  .action(() => {
    ensureInitialized();
    const state = getState();
    if (state.activeProfile) {
      console.error(chalk.red('✗') + ` Cannot refresh base while profile "${state.activeProfile}" is active.`);
      console.error('  Run ' + chalk.bold('claude-switch reset') + ' first.');
      process.exit(1);
    }
    refreshBase();
    console.log(chalk.green('✓') + ' Base config re-snapshotted from current settings.json.');
  });

program.parse();
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Test the CLI end-to-end**

```bash
# Test version
node dist/cli.js --version

# Test list (should show empty)
node dist/cli.js list

# Test current (should show vanilla)
node dist/cli.js current

# Test help
node dist/cli.js --help
```

- [ ] **Step 4: Commit**

```bash
git add src/cli.tsx
git commit -m "feat: add CLI entry point wiring all commands together"
```

---

## Task 14: End-to-End Smoke Test

**Files:**
- Test: `src/e2e.test.ts`

- [ ] **Step 1: Write the E2E test**

```typescript
// src/e2e.test.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ensureInitialized } from './lib/init';
import { saveProfile, loadProfile, listProfiles } from './lib/profiles';
import { applyProfile, resetToBase } from './lib/settings';
import { getState, setActiveProfile, clearActiveProfile } from './lib/state';
import type { Profile } from './types';

describe('e2e: full switch cycle', () => {
  let testHome: string;
  let originalHome: string;

  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-switcher-e2e-'));
    originalHome = process.env.HOME!;
    process.env.HOME = testHome;

    // Set up a vanilla claude settings.json
    const claudeDir = path.join(testHome, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({
        permissions: { allow: ['Bash(git status:*)'] },
        enabledPlugins: { 'superpowers@official': true },
      }, null, 2)
    );
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(testHome, { recursive: true, force: true });
  });

  it('init → add profile → switch → verify settings → reset → verify clean', () => {
    // 1. Init
    ensureInitialized();
    expect(fs.existsSync(path.join(testHome, '.claude-switcher', 'base-settings.json'))).toBe(true);

    // 2. Add a profile
    const profile: Profile = {
      version: 1,
      name: 'deepseek',
      displayName: 'DeepSeek V3.2',
      provider: 'deepseek',
      env: {
        ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
        ANTHROPIC_AUTH_TOKEN: 'sk-test123',
        ANTHROPIC_MODEL: 'deepseek-chat',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'deepseek-chat',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'deepseek-chat',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'deepseek-chat',
        API_TIMEOUT_MS: '3000000',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      },
    };
    saveProfile(profile);
    expect(listProfiles()).toHaveLength(1);

    // 3. Switch to it
    const hash = applyProfile(profile.env);
    setActiveProfile('deepseek', hash);

    // 4. Verify settings.json has env + preserved other keys
    const settings = JSON.parse(
      fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8')
    );
    expect(settings.env.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
    expect(settings.permissions.allow).toContain('Bash(git status:*)');
    expect(settings.enabledPlugins['superpowers@official']).toBe(true);

    // 5. Verify state
    const state = getState();
    expect(state.activeProfile).toBe('deepseek');

    // 6. Reset
    resetToBase();
    clearActiveProfile();

    // 7. Verify clean
    const cleanSettings = JSON.parse(
      fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8')
    );
    expect(cleanSettings.env).toBeUndefined();
    expect(cleanSettings.permissions.allow).toContain('Bash(git status:*)');
    expect(getState().activeProfile).toBeNull();
  });

  it('switching providers does not leak stale env vars', () => {
    ensureInitialized();

    // Switch to provider A
    const envA = { ANTHROPIC_BASE_URL: 'https://a.com', ANTHROPIC_AUTH_TOKEN: 'key-a', CUSTOM_A: 'only-a' };
    applyProfile(envA);

    // Switch to provider B
    const envB = { ANTHROPIC_BASE_URL: 'https://b.com', ANTHROPIC_AUTH_TOKEN: 'key-b', CUSTOM_B: 'only-b' };
    applyProfile(envB);

    const settings = JSON.parse(
      fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8')
    );
    expect(settings.env.ANTHROPIC_BASE_URL).toBe('https://b.com');
    expect(settings.env.CUSTOM_B).toBe('only-b');
    expect(settings.env.CUSTOM_A).toBeUndefined(); // No leak
  });
});
```

- [ ] **Step 2: Run E2E test**

```bash
npx jest src/e2e.test.ts
```

Expected: PASS

- [ ] **Step 3: Run all tests**

```bash
npx jest
```

Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/e2e.test.ts
git commit -m "test: add end-to-end smoke test for full switch cycle"
```

---

## Task 15: Final Polish & Global Install Test

- [ ] **Step 1: Build the project**

```bash
npm run build
```

Expected: Compiles with no errors.

- [ ] **Step 2: Test global install locally**

```bash
npm link
claude-switch --version
claude-switch --help
claude-switch list
claude-switch current
```

Expected: All commands run without error.

- [ ] **Step 3: Run full test suite one last time**

```bash
npx jest --verbose
```

Expected: All tests PASS.

- [ ] **Step 4: Unlink after testing**

```bash
npm unlink -g claude-switcher
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final build verification and polish"
```
