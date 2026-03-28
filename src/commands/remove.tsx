import { loadProfile, deleteProfile } from '../lib/profiles';
import { getState, clearActiveProfile } from '../lib/state';
import { resetToBase } from '../lib/settings';
import { ensureInitialized } from '../lib/init';
import chalk from 'chalk';

export function runRemove(name: string): void {
  ensureInitialized();
  const profile = loadProfile(name);
  if (!profile) { console.error(chalk.red('✗') + ` Profile "${name}" not found.`); process.exit(1); }
  const state = getState();
  if (state.activeProfile === name) { resetToBase(); clearActiveProfile(); console.log(chalk.yellow('⚠') + ` "${name}" was the active profile. Reset to vanilla Claude config.`); }
  deleteProfile(name);
  console.log(chalk.green('✓') + ` Profile "${name}" removed.`);
}
