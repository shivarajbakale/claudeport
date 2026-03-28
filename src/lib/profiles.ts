import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Profile } from '../types';
import { isValidProfileName } from '../types';

function homeDir(): string { return process.env.HOME || os.homedir(); }
function profilesDir(): string { return path.join(homeDir(), '.claude-switcher', 'profiles'); }
function profilePath(name: string): string { return path.join(profilesDir(), `${name}.json`); }

export function saveProfile(profile: Profile): void {
  if (!isValidProfileName(profile.name)) throw new Error(`Invalid profile name: "${profile.name}". Use lowercase alphanumeric and hyphens only, max 64 chars.`);
  fs.writeFileSync(profilePath(profile.name), JSON.stringify(profile, null, 2), { mode: 0o600 });
}
export function loadProfile(name: string): Profile | null { const p = profilePath(name); if (!fs.existsSync(p)) return null; return JSON.parse(fs.readFileSync(p, 'utf-8')); }
export function listProfiles(): Profile[] {
  const dir = profilesDir(); if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))).sort((a, b) => a.name.localeCompare(b.name));
}
export function deleteProfile(name: string): void { const p = profilePath(name); if (fs.existsSync(p)) fs.unlinkSync(p); }
export function profileExists(name: string): boolean { return fs.existsSync(profilePath(name)); }
