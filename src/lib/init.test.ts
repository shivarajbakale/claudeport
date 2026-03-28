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
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ permissions: { allow: ['Bash(git status:*)'] } }, null, 2));
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
