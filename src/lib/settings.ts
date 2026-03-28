import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import type { ClaudeSettings } from '../types';

function homeDir(): string { return process.env.HOME || os.homedir(); }
function basePath(): string { return path.join(homeDir(), '.claude-switcher', 'base-settings.json'); }
function claudeSettingsPath(): string { return path.join(homeDir(), '.claude', 'settings.json'); }

export function readBaseSettings(): ClaudeSettings { return JSON.parse(fs.readFileSync(basePath(), 'utf-8')); }
export function computeHash(content: string): string { return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex'); }

export function applyProfile(env: Record<string, string>): string {
  const base = readBaseSettings();
  const merged: ClaudeSettings = { ...base, env };
  const content = JSON.stringify(merged, null, 2);
  const settingsDir = path.dirname(claudeSettingsPath());
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(claudeSettingsPath(), content);
  return computeHash(content);
}

export function resetToBase(): void {
  const base = readBaseSettings();
  const settingsDir = path.dirname(claudeSettingsPath());
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(claudeSettingsPath(), JSON.stringify(base, null, 2));
}

export function detectManualEdits(lastHash: string | null): boolean {
  if (!lastHash) return false;
  const p = claudeSettingsPath();
  if (!fs.existsSync(p)) return true;
  return computeHash(fs.readFileSync(p, 'utf-8')) !== lastHash;
}

export function refreshBase(): void {
  const current = fs.existsSync(claudeSettingsPath()) ? fs.readFileSync(claudeSettingsPath(), 'utf-8') : '{}';
  fs.writeFileSync(basePath(), current, { mode: 0o600 });
}
