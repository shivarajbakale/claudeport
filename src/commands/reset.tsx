import { resetToBase } from '../lib/settings';
import { clearActiveProfile } from '../lib/state';
import { ensureInitialized } from '../lib/init';
import chalk from 'chalk';

export function runReset(): void {
  ensureInitialized(); resetToBase(); clearActiveProfile();
  console.log(chalk.green('✓') + ' Restored vanilla Claude configuration. Env block removed from settings.json.');
}
