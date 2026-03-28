import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { saveProfile, loadProfile, listProfiles, deleteProfile } from './profiles';
import type { Profile } from '../types';

describe('profiles', () => {
  let testHome: string; let originalHome: string;
  beforeEach(() => {
    testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-switcher-test-'));
    originalHome = process.env.HOME!; process.env.HOME = testHome;
    fs.mkdirSync(path.join(testHome, '.claude-switcher', 'profiles'), { recursive: true });
  });
  afterEach(() => { process.env.HOME = originalHome; fs.rmSync(testHome, { recursive: true, force: true }); });

  const testProfile: Profile = { version: 1, name: 'deepseek', displayName: 'DeepSeek V3.2', provider: 'deepseek', env: { ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic', ANTHROPIC_AUTH_TOKEN: 'sk-test123', ANTHROPIC_MODEL: 'deepseek-chat' } };

  it('saves and loads a profile', () => { saveProfile(testProfile); expect(loadProfile('deepseek')).toEqual(testProfile); });
  it('returns null for non-existent profile', () => { expect(loadProfile('nonexistent')).toBeNull(); });
  it('lists all profiles', () => { saveProfile(testProfile); saveProfile({ ...testProfile, name: 'minimax', displayName: 'MiniMax' }); expect(listProfiles()).toHaveLength(2); });
  it('deletes a profile', () => { saveProfile(testProfile); deleteProfile('deepseek'); expect(loadProfile('deepseek')).toBeNull(); });
  it('rejects invalid profile names', () => { expect(() => saveProfile({ ...testProfile, name: 'INVALID NAME' })).toThrow(); });
});
