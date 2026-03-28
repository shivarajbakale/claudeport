import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readBaseSettings, applyProfile, resetToBase, computeHash, detectManualEdits } from './settings';

describe('settings', () => {
  let testHome: string; let originalHome: string;
  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-switcher-test-'));
    originalHome = process.env.HOME!; process.env.HOME = testHome;
    fs.mkdirSync(path.join(testHome, '.claude-switcher', 'profiles'), { recursive: true });
    fs.mkdirSync(path.join(testHome, '.claude'), { recursive: true });
  });
  afterEach(() => { process.env.HOME = originalHome; fs.rmSync(testHome, { recursive: true, force: true }); });

  const baseSettings = { permissions: { allow: ['Bash(git status:*)'] }, enabledPlugins: { 'superpowers@official': true } };
  const profileEnv = { ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic', ANTHROPIC_AUTH_TOKEN: 'sk-test', ANTHROPIC_MODEL: 'deepseek-chat' };

  it('applies profile env without clobbering other keys', () => {
    fs.writeFileSync(path.join(testHome, '.claude-switcher', 'base-settings.json'), JSON.stringify(baseSettings, null, 2));
    applyProfile(profileEnv);
    const result = JSON.parse(fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8'));
    expect(result.permissions.allow).toContain('Bash(git status:*)');
    expect(result.env.ANTHROPIC_BASE_URL).toBe('https://api.deepseek.com/anthropic');
  });
  it('replaces env entirely on switch (no stale keys)', () => {
    fs.writeFileSync(path.join(testHome, '.claude-switcher', 'base-settings.json'), JSON.stringify(baseSettings, null, 2));
    applyProfile({ ...profileEnv, EXTRA_KEY: 'stale' });
    applyProfile(profileEnv);
    const result = JSON.parse(fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8'));
    expect(result.env.EXTRA_KEY).toBeUndefined();
  });
  it('resets to base (removes env key)', () => {
    fs.writeFileSync(path.join(testHome, '.claude-switcher', 'base-settings.json'), JSON.stringify(baseSettings, null, 2));
    applyProfile(profileEnv); resetToBase();
    const result = JSON.parse(fs.readFileSync(path.join(testHome, '.claude', 'settings.json'), 'utf-8'));
    expect(result.env).toBeUndefined();
  });
  it('detects manual edits via hash comparison', () => {
    fs.writeFileSync(path.join(testHome, '.claude-switcher', 'base-settings.json'), JSON.stringify(baseSettings, null, 2));
    const hash = applyProfile(profileEnv);
    expect(detectManualEdits(hash)).toBe(false);
    const settingsPath = path.join(testHome, '.claude', 'settings.json');
    const current = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    current.newKey = 'manually added';
    fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2));
    expect(detectManualEdits(hash)).toBe(true);
  });
});
