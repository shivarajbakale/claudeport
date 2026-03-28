import React from 'react';
import { Box, Text } from 'ink';
import type { Profile } from '../types';
import { maskApiKey } from '../types';

interface Props {
  profile: Profile;
  isActive?: boolean;
}

export function ProfileCard({ profile, isActive }: Props) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isActive ? 'green' : 'gray'} padding={1}>
      <Text bold>{profile.displayName} {isActive && <Text color="green">(active)</Text>}</Text>
      <Text>Base URL: <Text color="cyan">{profile.env.ANTHROPIC_BASE_URL}</Text></Text>
      <Text>Model:    <Text color="yellow">{profile.env.ANTHROPIC_MODEL}</Text></Text>
      <Text>API Key:  <Text dimColor>{maskApiKey(profile.env.ANTHROPIC_AUTH_TOKEN || '')}</Text></Text>
    </Box>
  );
}
