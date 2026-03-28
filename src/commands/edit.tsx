import React, { useState } from 'react';
import { render, Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { KeyInput } from '../components/KeyInput';
import { ProfileCard } from '../components/ProfileCard';
import { loadProfile, saveProfile } from '../lib/profiles';
import { ensureInitialized } from '../lib/init';
import type { Profile } from '../types';

type EditField = 'menu' | 'base-url' | 'model' | 'api-key' | 'display-name' | 'done';

function EditApp({ name }: { name: string }) {
  const { exit } = useApp();
  const [profile, setProfile] = useState<Profile | null>(loadProfile(name));
  const [step, setStep] = useState<EditField>('menu');
  const [inputValue, setInputValue] = useState('');

  if (!profile) { setTimeout(() => exit(), 100); return <Text color="red">Profile "{name}" not found.</Text>; }
  if (step === 'done') { setTimeout(() => exit(), 100); return <Text color="green">✓ Profile "{name}" updated.</Text>; }

  if (step === 'menu') {
    return (<Box flexDirection="column" padding={1}>
      <ProfileCard profile={profile} />
      <Text>{'\n'}What would you like to edit?{'\n'}</Text>
      <SelectInput items={[
        { label: 'Display Name', value: 'display-name' }, { label: 'Base URL', value: 'base-url' },
        { label: 'Model', value: 'model' }, { label: 'API Key', value: 'api-key' }, { label: 'Done', value: 'done' },
      ]} onSelect={(item) => setStep(item.value as EditField)} />
    </Box>);
  }
  if (step === 'display-name') {
    return (<Box padding={1}><Text>Display name ({profile.displayName}): </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => {
      if (val) { const updated = { ...profile, displayName: val }; saveProfile(updated); setProfile(updated); } setInputValue(''); setStep('menu');
    }} /></Box>);
  }
  if (step === 'base-url') {
    return (<Box padding={1}><Text>Base URL ({profile.env.ANTHROPIC_BASE_URL}): </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => {
      if (val) { const updated = { ...profile, env: { ...profile.env, ANTHROPIC_BASE_URL: val } }; saveProfile(updated); setProfile(updated); } setInputValue(''); setStep('menu');
    }} /></Box>);
  }
  if (step === 'model') {
    return (<Box padding={1}><Text>Model ({profile.env.ANTHROPIC_MODEL}): </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => {
      if (val) { const updated = { ...profile, env: { ...profile.env, ANTHROPIC_MODEL: val, ANTHROPIC_DEFAULT_SONNET_MODEL: val, ANTHROPIC_DEFAULT_OPUS_MODEL: val, ANTHROPIC_DEFAULT_HAIKU_MODEL: val } }; saveProfile(updated); setProfile(updated); }
      setInputValue(''); setStep('menu');
    }} /></Box>);
  }
  if (step === 'api-key') {
    return (<Box padding={1}><KeyInput label="New API key:" onSubmit={(val) => {
      if (val) { const updated = { ...profile, env: { ...profile.env, ANTHROPIC_AUTH_TOKEN: val } }; saveProfile(updated); setProfile(updated); } setStep('menu');
    }} /></Box>);
  }
  return null;
}

export function runEdit(name: string): void { ensureInitialized(); render(<EditApp name={name} />); }
