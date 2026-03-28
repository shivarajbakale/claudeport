import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { Profile } from '../types';

interface Props {
  profiles: Profile[];
  activeProfile: string | null;
  onSelect: (name: string) => void;
}

export function ProfileSelector({ profiles, activeProfile, onSelect }: Props) {
  const items = [
    ...profiles.map(p => ({
      label: `${p.name === activeProfile ? '● ' : '○ '}${p.displayName}${p.name === activeProfile ? '  (active)' : ''}`,
      value: p.name,
    })),
    {
      label: `${activeProfile === null ? '● ' : '○ '}Default Claude  (vanilla)`,
      value: '__reset__',
    },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Claude Switcher</Text>
      <Text>{'\n'}Select a provider:{'\n'}</Text>
      <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
      <Text dimColor>{'\n'}↑↓ Navigate  ⏎ Select  q Quit</Text>
    </Box>
  );
}
