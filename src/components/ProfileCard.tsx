import React from 'react';
import { Box, Text } from 'ink';
import type { Profile } from '../types';
import { maskApiKey } from '../types';

interface Props {
  profile: Profile;
  isActive?: boolean;
}

export function ProfileCard({ profile, isActive }: Props) {
  const opus = profile.env.ANTHROPIC_DEFAULT_OPUS_MODEL;
  const sonnet = profile.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  const haiku = profile.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
  const allSame = opus === sonnet && sonnet === haiku;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isActive ? 'green' : 'gray'} padding={1}>
      <Text bold>{profile.displayName} {isActive && <Text color="green">(active)</Text>}</Text>
      <Text>Base URL: <Text color="cyan">{profile.env.ANTHROPIC_BASE_URL}</Text></Text>
      {allSame ? (
        <Text>Model:    <Text color="yellow">{profile.env.ANTHROPIC_MODEL}</Text></Text>
      ) : (
        <>
          <Text>Models:</Text>
          <Text>  Opus:   <Text color="yellow">{opus}</Text></Text>
          <Text>  Sonnet: <Text color="yellow">{sonnet}</Text></Text>
          <Text>  Haiku:  <Text color="yellow">{haiku}</Text></Text>
        </>
      )}
      <Text>API Key:  <Text dimColor>{maskApiKey(profile.env.ANTHROPIC_AUTH_TOKEN || '')}</Text></Text>
    </Box>
  );
}
