import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { ProfileSelector } from '../components/ProfileSelector';
import { listProfiles, loadProfile } from '../lib/profiles';
import { applyProfile, resetToBase, detectManualEdits } from '../lib/settings';
import { getState, setActiveProfile, clearActiveProfile } from '../lib/state';
import { ensureInitialized } from '../lib/init';
import chalk from 'chalk';

function SwitchApp() {
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const profiles = listProfiles();
  const state = getState();

  if (profiles.length === 0) {
    return (<Box flexDirection="column" padding={1}><Text color="yellow">No profiles found. Run <Text bold>claude-switch add</Text> to create one.</Text></Box>);
  }
  if (done) {
    return (<Box padding={1}><Text>{message}</Text></Box>);
  }

  const handleSelect = (name: string) => {
    if (detectManualEdits(state.lastWrittenHash)) {
      console.warn(chalk.yellow('⚠') + ' settings.json has been manually edited since last switch.');
    }
    if (name === '__reset__') {
      resetToBase(); clearActiveProfile();
      setMessage(chalk.green('✓') + ' Restored vanilla Claude configuration.');
    } else {
      const profile = loadProfile(name);
      if (!profile) { setMessage(chalk.red('✗') + ` Profile "${name}" not found.`); }
      else if (!profile.env.ANTHROPIC_BASE_URL) { setMessage(chalk.red('✗') + ` Profile "${name}" missing ANTHROPIC_BASE_URL.`); }
      else if (profile.env.ANTHROPIC_AUTH_TOKEN === '<YOUR_API_KEY>') { setMessage(chalk.red('✗') + ` Profile "${name}" has a placeholder API key. Run claude-switch edit ${name} to set it.`); }
      else { const hash = applyProfile(profile.env); setActiveProfile(name, hash); setMessage(chalk.green('✓') + ` Switched to ${profile.displayName}.`); }
    }
    setDone(true);
  };

  return <ProfileSelector profiles={profiles} activeProfile={state.activeProfile} onSelect={handleSelect} />;
}

export function runInteractiveSwitch(): void { ensureInitialized(); render(<SwitchApp />); }

export function runDirectSwitch(name: string): void {
  ensureInitialized();
  const profile = loadProfile(name);
  if (!profile) { console.error(chalk.red('✗') + ` Profile "${name}" not found.`); process.exit(1); }
  if (!profile.env.ANTHROPIC_BASE_URL) { console.error(chalk.red('✗') + ` Profile "${name}" is missing ANTHROPIC_BASE_URL.`); process.exit(1); }
  if (profile.env.ANTHROPIC_AUTH_TOKEN === '<YOUR_API_KEY>') { console.error(chalk.red('✗') + ` Profile "${name}" has a placeholder API key. Run ${chalk.bold(`claude-switch edit ${name}`)} to set it.`); process.exit(1); }
  const state = getState();
  if (detectManualEdits(state.lastWrittenHash)) { console.warn(chalk.yellow('⚠') + ' settings.json has been manually edited since last switch.'); }
  const hash = applyProfile(profile.env); setActiveProfile(name, hash);
  console.log(chalk.green('✓') + ` Switched to ${profile.displayName}.`);
}
