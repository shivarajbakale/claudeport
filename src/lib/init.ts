import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function homeDir(): string { return process.env.HOME || os.homedir(); }

export function switcherDir(): string { return path.join(homeDir(), '.claude-switcher'); }
export function profilesDir(): string { return path.join(switcherDir(), 'profiles'); }
export function baseSettingsPath(): string { return path.join(switcherDir(), 'base-settings.json'); }
export function statePath(): string { return path.join(switcherDir(), 'state.json'); }
export function claudeSettingsPath(): string { return path.join(homeDir(), '.claude', 'settings.json'); }

export function ensureInitialized(): void {
  const profDir = profilesDir();
  if (!fs.existsSync(profDir)) fs.mkdirSync(profDir, { recursive: true, mode: 0o700 });
  const basePath = baseSettingsPath();
  if (!fs.existsSync(basePath)) {
    let baseSettings = {};
    const claudePath = claudeSettingsPath();
    if (fs.existsSync(claudePath)) baseSettings = JSON.parse(fs.readFileSync(claudePath, 'utf-8'));
    fs.writeFileSync(basePath, JSON.stringify(baseSettings, null, 2), { mode: 0o600 });
  }
  const stPath = statePath();
  if (!fs.existsSync(stPath)) {
    fs.writeFileSync(stPath, JSON.stringify({ version: 1, activeProfile: null, lastSwitched: null, lastWrittenHash: null }, null, 2), { mode: 0o600 });
  }
}
