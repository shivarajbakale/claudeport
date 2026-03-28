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

    const envA = { ANTHROPIC_BASE_URL: 'https://a.com', ANTHROPIC_AUTH_TOKEN: 'key-a', CUSTOM_A: 'only-a' };
    applyProfile(envA);

    const envB = { ANTHROPIC_BASE_URL: 'https://b.com', ANTHROPIC_AUTH_TOKEN: 'key-b', CUSTOM_B: 'only-b' };
    applyProfile(envB);

    const settings = JSON.parse(
      fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8')
    );
    expect(settings.env.ANTHROPIC_BASE_URL).toBe('https://b.com');
    expect(settings.env.CUSTOM_B).toBe('only-b');
    expect(settings.env.CUSTOM_A).toBeUndefined();
  });
});
