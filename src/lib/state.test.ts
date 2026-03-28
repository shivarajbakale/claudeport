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
  afterEach(() => { process.env.HOME = originalHome; fs.rmSync(testHome, { recursive: true, force: true }); });

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
    expect(getState().activeProfile).toBeNull();
  });
});
