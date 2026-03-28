import { Command } from 'commander';
import { runInteractiveSwitch, runDirectSwitch } from './commands/switch';
import { runAdd } from './commands/add';
import { runList } from './commands/list';
import { runCurrent } from './commands/current';
import { runReset } from './commands/reset';
import { runEdit } from './commands/edit';
import { runRemove } from './commands/remove';
import { getState } from './lib/state';
import { refreshBase } from './lib/settings';
import { ensureInitialized } from './lib/init';
import chalk from 'chalk';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const program = new Command();

program.name('claude-switch').description('Switch Claude Code between AI model providers').version(pkg.version)
  .argument('[name]', 'Profile name to switch to directly')
  .action((name?: string) => { if (name) { runDirectSwitch(name); } else { runInteractiveSwitch(); } });

program.command('add [name]').description('Add a new provider profile').action((name?: string) => { runAdd(name); });
program.command('list').description('List all provider profiles').action(() => { runList(); });
program.command('current').description('Show the currently active provider').action(() => { runCurrent(); });
program.command('reset').description('Restore vanilla Claude configuration').action(() => { runReset(); });
program.command('edit <name>').description('Edit an existing profile').action((name: string) => { runEdit(name); });
program.command('remove <name>').description('Remove a provider profile').action((name: string) => { runRemove(name); });
program.command('refresh-base').description('Re-snapshot current settings as the vanilla base config').action(() => {
  ensureInitialized(); const state = getState();
  if (state.activeProfile) { console.error(chalk.red('✗') + ` Cannot refresh base while profile "${state.activeProfile}" is active.`); console.error('  Run ' + chalk.bold('claude-switch reset') + ' first.'); process.exit(1); }
  refreshBase(); console.log(chalk.green('✓') + ' Base config re-snapshotted from current settings.json.');
});

program.parse();
