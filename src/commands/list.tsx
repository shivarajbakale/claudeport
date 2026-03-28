import React from 'react';
import { render, Box, Text } from 'ink';
import { listProfiles } from '../lib/profiles';
import { getState } from '../lib/state';
import { ensureInitialized } from '../lib/init';
import chalk from 'chalk';

function ListApp() {
  const profiles = listProfiles();
  const state = getState();
  if (profiles.length === 0) {
    return (<Box padding={1}><Text color="yellow">No profiles found. Run <Text bold>claude-switch add</Text> to create one.</Text></Box>);
  }
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Profiles:{'\n'}</Text>
      {profiles.map(p => {
        const opus = p.env.ANTHROPIC_DEFAULT_OPUS_MODEL;
        const sonnet = p.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
        const haiku = p.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
        const allSame = opus === sonnet && sonnet === haiku;
        return (
          <Box key={p.name} flexDirection="column">
            <Text>
              {p.name === state.activeProfile ? chalk.green('● ') : '○ '}
              <Text bold>{p.displayName}</Text>
              <Text dimColor> ({p.name})</Text>
              <Text dimColor> — {p.env.ANTHROPIC_BASE_URL}</Text>
              {p.name === state.activeProfile && <Text color="green"> (active)</Text>}
            </Text>
            {!allSame && (
              <Text dimColor>    opus:{opus} / sonnet:{sonnet} / haiku:{haiku}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export function runList(): void { ensureInitialized(); render(<ListApp />); }
