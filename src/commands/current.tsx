import React from 'react';
import { render, Box, Text } from 'ink';
import { loadProfile } from '../lib/profiles';
import { getState } from '../lib/state';
import { ProfileCard } from '../components/ProfileCard';
import { ensureInitialized } from '../lib/init';

function CurrentApp() {
  const state = getState();
  if (!state.activeProfile) {
    return (<Box padding={1}><Text color="cyan">Using default Claude configuration (vanilla).</Text></Box>);
  }
  const profile = loadProfile(state.activeProfile);
  if (!profile) {
    return (<Box padding={1}><Text color="red">Active profile "{state.activeProfile}" not found. Run <Text bold>claude-switch reset</Text>.</Text></Box>);
  }
  return (
    <Box flexDirection="column" padding={1}>
      <ProfileCard profile={profile} isActive={true} />
      {state.lastSwitched && (<Text dimColor>{'\n'}Switched at: {new Date(state.lastSwitched).toLocaleString()}</Text>)}
    </Box>
  );
}

export function runCurrent(): void { ensureInitialized(); render(<CurrentApp />); }
