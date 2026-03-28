import React, { useState, useEffect } from 'react';
import { render, Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { KeyInput } from '../components/KeyInput';
import { saveProfile, profileExists } from '../lib/profiles';
import { applyProfile } from '../lib/settings';
import { setActiveProfile } from '../lib/state';
import { ensureInitialized } from '../lib/init';
import { searchProviderConfig } from '../lib/search';
import { isValidProfileName } from '../types';
import type { Profile, SearchResult } from '../types';

type Step = 'name-prompt' | 'searching' | 'confirm' | 'manual-url' | 'manual-model' | 'manual-timeout' | 'select-model' | 'api-key' | 'overwrite' | 'switch-now' | 'done';

function AddApp({ initialName }: { initialName?: string }) {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>(initialName ? 'searching' : 'name-prompt');
  const [name, setName] = useState(initialName || '');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (step === 'searching' && name) {
      searchProviderConfig(name).then(result => {
        if (result) { setSearchResult(result); setEnv(result.env); setStep('confirm'); }
        else { setStep('manual-url'); }
      });
    }
  }, [step, name]);

  if (step === 'name-prompt') {
    return (<Box padding={1}><Text>Profile name (lowercase, hyphens ok): </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => {
      if (!isValidProfileName(val)) { setMessage('Invalid name. Use lowercase alphanumeric and hyphens, max 64 chars.'); setStep('done'); return; }
      setName(val); setInputValue(''); setStep('searching');
    }} /></Box>);
  }
  if (step === 'searching') { return (<Box padding={1}><Text><Spinner type="dots" /> Searching for {name} Claude Code configuration...</Text></Box>); }
  if (step === 'confirm' && searchResult) {
    return (<Box flexDirection="column" padding={1}>
      <Text color="green">✓ Found configuration from {searchResult.source}{'\n'}</Text>
      <Text>Base URL: <Text color="cyan">{env.ANTHROPIC_BASE_URL}</Text></Text>
      <Text>Models:   <Text color="yellow">{searchResult.models.join(', ')}</Text></Text>
      <Text>{'\n'}Use this configuration?</Text>
      <SelectInput items={[{ label: 'Yes', value: 'yes' }, { label: 'No, enter manually', value: 'no' }]}
        onSelect={(item) => { if (item.value === 'yes') { setStep(searchResult.models.length > 1 ? 'select-model' : 'api-key'); } else { setStep('manual-url'); } }} />
    </Box>);
  }
  if (step === 'manual-url') { return (<Box padding={1}><Text>Enter the Anthropic-compatible base URL: </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(url) => { setEnv(prev => ({ ...prev, ANTHROPIC_BASE_URL: url })); setInputValue(''); setStep('manual-model'); }} /></Box>); }
  if (step === 'manual-model') { return (<Box padding={1}><Text>Enter the model name: </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(model) => { setEnv(prev => ({ ...prev, ANTHROPIC_MODEL: model, ANTHROPIC_DEFAULT_SONNET_MODEL: model, ANTHROPIC_DEFAULT_OPUS_MODEL: model, ANTHROPIC_DEFAULT_HAIKU_MODEL: model })); setInputValue(''); setStep('manual-timeout'); }} /></Box>); }
  if (step === 'manual-timeout') { return (<Box padding={1}><Text>Custom timeout in ms? (default: 3000000): </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(timeout) => { const t = timeout || '3000000'; setEnv(prev => ({ ...prev, API_TIMEOUT_MS: t, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' })); setInputValue(''); setStep('api-key'); }} /></Box>); }
  if (step === 'select-model' && searchResult) {
    return (<Box flexDirection="column" padding={1}><Text>Select default model:{'\n'}</Text>
      <SelectInput items={searchResult.models.map(m => ({ label: m, value: m }))} onSelect={(item) => { setEnv(prev => ({ ...prev, ANTHROPIC_MODEL: item.value, ANTHROPIC_DEFAULT_SONNET_MODEL: item.value, ANTHROPIC_DEFAULT_OPUS_MODEL: item.value, ANTHROPIC_DEFAULT_HAIKU_MODEL: item.value })); setStep('api-key'); }} />
    </Box>);
  }
  if (step === 'api-key') {
    return (<Box padding={1}><KeyInput label="Enter your API key:" onSubmit={(key) => {
      setEnv(prev => ({ ...prev, ANTHROPIC_AUTH_TOKEN: key || '<YOUR_API_KEY>' }));
      if (profileExists(name)) { setStep('overwrite'); } else { doSave(key || '<YOUR_API_KEY>'); }
    }} /></Box>);
  }
  if (step === 'overwrite') {
    return (<Box flexDirection="column" padding={1}><Text color="yellow">Profile "{name}" already exists. Overwrite?</Text>
      <SelectInput items={[{ label: 'Yes, overwrite', value: 'yes' }, { label: 'Cancel', value: 'no' }]}
        onSelect={(item) => { if (item.value === 'yes') { doSave(env.ANTHROPIC_AUTH_TOKEN); } else { setMessage('Cancelled.'); setStep('done'); } }} />
    </Box>);
  }
  if (step === 'switch-now') {
    return (<Box flexDirection="column" padding={1}><Text color="green">✓ Profile "{name}" saved!{'\n'}</Text><Text>Switch to it now?</Text>
      <SelectInput items={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
        onSelect={(item) => { if (item.value === 'yes') { const hash = applyProfile(env); setActiveProfile(name, hash); setMessage(`✓ Switched to ${name}.`); } else { setMessage('Profile saved. Switch later with: claude-switch ' + name); } setStep('done'); }} />
    </Box>);
  }
  if (step === 'done') { setTimeout(() => exit(), 100); return (<Box padding={1}><Text>{message}</Text></Box>); }
  return null;

  function doSave(apiKey: string) {
    const profile: Profile = { version: 1, name, displayName: name.charAt(0).toUpperCase() + name.slice(1), provider: name, env: { ...env, ANTHROPIC_AUTH_TOKEN: apiKey } };
    saveProfile(profile); setStep('switch-now');
  }
}

export function runAdd(name?: string): void {
  ensureInitialized();
  if (name && !isValidProfileName(name)) { console.error(`Invalid profile name: "${name}". Use lowercase alphanumeric and hyphens only, max 64 chars.`); process.exit(1); }
  render(<AddApp initialName={name} />);
}
