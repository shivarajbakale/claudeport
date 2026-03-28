import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { State } from '../types';

function homeDir(): string { return process.env.HOME || os.homedir(); }
function statePath(): string { return path.join(homeDir(), '.claude-switcher', 'state.json'); }

const DEFAULT_STATE: State = { version: 1, activeProfile: null, lastSwitched: null, lastWrittenHash: null };

export function getState(): State {
  const p = statePath();
  if (!fs.existsSync(p)) return { ...DEFAULT_STATE };
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
function writeState(state: State): void { fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), { mode: 0o600 }); }

export function setActiveProfile(name: string, hash: string): void {
  const state = getState(); state.activeProfile = name; state.lastSwitched = new Date().toISOString(); state.lastWrittenHash = hash; writeState(state);
}
export function clearActiveProfile(): void {
  const state = getState(); state.activeProfile = null; state.lastSwitched = new Date().toISOString(); state.lastWrittenHash = null; writeState(state);
}
