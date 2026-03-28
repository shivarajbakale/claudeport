import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { KeyInput } from '../components/KeyInput';
import { saveProfile, profileExists } from '../lib/profiles';
import { applyProfile } from '../lib/settings';
import { setActiveProfile } from '../lib/state';
import { ensureInitialized } from '../lib/init';
import { listProviders, matchProvider, getProvider } from '../lib/providers';
import { isValidProfileName } from '../types';
import type { Profile } from '../types';
import type { Provider } from '../lib/providers';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type Step = 'name-prompt' | 'select-provider' | 'confirm' | 'api-key' | 'overwrite' | 'switch-now' | 'done';

function AddApp({ initialName }: { initialName?: string }) {
  const [step, setStep] = useState<Step>(initialName ? 'confirm' : 'name-prompt');
  const [name, setName] = useState(initialName || '');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [message, setMessage] = useState('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (step === 'confirm' && name) {
      const matched = matchProvider(name);
      if (matched) {
        setProvider(matched);
        if (matched.models.length > 0) {
          setSelectedModel(matched.models[0]);
        }
      } else {
        setStep('select-provider');
      }
    }
  }, [step, name]);

  if (step === 'name-prompt') {
    return (<Box padding={1}><Text>Profile name (lowercase, hyphens/dots ok): </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => {
      if (!isValidProfileName(val)) { setMessage('Invalid name. Use lowercase alphanumeric, hyphens, dots. Max 64 chars.'); setStep('done'); return; }
      setName(val); setInputValue(''); setStep('confirm');
    }} /></Box>);
  }

  if (step === 'select-provider') {
    const items = listProviders().map(p => ({ label: p.displayName, value: p.name }));
    return (<Box flexDirection="column" padding={1}>
      <Text>No known provider matched "{name}". Select one:{'\n'}</Text>
      <SelectInput items={items} onSelect={(item) => {
        const p = getProvider(item.value);
        if (p) { setProvider(p); setName(item.value); if (p.models.length > 0) setSelectedModel(p.models[0]); setStep('confirm'); }
      }} />
    </Box>);
  }

  if (step === 'confirm' && provider) {
    const modelItems = provider.models.length > 0
      ? provider.models.map(m => ({ label: m, value: m }))
      : [{ label: '(enter manually)', value: '__manual__' }];

    return (<Box flexDirection="column" padding={1}>
      <Text color="green">✓ Provider: <Text color="cyan">{provider.displayName}</Text>{'\n'}</Text>
      <Text>Base URL: <Text color="yellow">{provider.baseUrl}</Text>{'\n'}</Text>
      {provider.models.length > 0 ? (
        <><Text>Model:{'  '}</Text>
          <SelectInput items={modelItems} onSelect={(item) => { setSelectedModel(item.value === '__manual__' ? '' : item.value); }} />
          <Text dimColor>Select model, then continue.{'\n'}</Text></>
      ) : (
        <><Text>Enter model name: </Text>
          <TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => { setSelectedModel(val); setInputValue(''); }} />
          <Text dimColor>Press Enter to continue.{'\n'}</Text></>
      )}
      <SelectInput items={[
        { label: selectedModel ? `Continue with ${selectedModel}` : 'Continue', value: 'continue' },
        { label: 'Edit in vim', value: 'vim' },
        { label: 'Pick different provider', value: 'select-provider' },
      ]} onSelect={(item) => {
        if (item.value === 'continue') { if (!selectedModel) return; setStep('api-key'); }
        else if (item.value === 'vim') { openVim(); }
        else { setStep('select-provider'); }
      }} />
    </Box>);
  }

  if (step === 'api-key') {
    return (<Box padding={1}><KeyInput label="Enter your API key:" onSubmit={(key) => {
      const apiKey = key || '<YOUR_API_KEY>';
      if (profileExists(name)) { setStep('overwrite'); } else { doSave(apiKey); }
    }} /></Box>);
  }

  if (step === 'overwrite') {
    return (<Box flexDirection="column" padding={1}><Text color="yellow">Profile "{name}" already exists. Overwrite?</Text>
      <SelectInput items={[{ label: 'Yes, overwrite', value: 'yes' }, { label: 'Cancel', value: 'no' }]}
        onSelect={(item) => { if (item.value === 'yes') { doSave(provider ? provider.models[0] : ''); } else { setMessage('Cancelled.'); setStep('done'); } }} />
    </Box>);
  }

  if (step === 'switch-now') {
    return (<Box flexDirection="column" padding={1}><Text color="green">✓ Profile "{name}" saved!{'\n'}</Text><Text>Switch to it now?</Text>
      <SelectInput items={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
        onSelect={(item) => {
          if (item.value === 'yes') { const env = buildEnv(); const hash = applyProfile(env); setActiveProfile(name, hash); setMessage('✓ Switched to ' + name + '.'); }
          else { setMessage('Profile saved. Switch later with: claude-switch ' + name); }
          setStep('done');
        }} />
    </Box>);
  }

  if (step === 'done') { return (<Box padding={1}><Text>{message}</Text></Box>); }
  return null;

  function buildEnv(): Record<string, string> {
    if (!provider) return {};
    const model = selectedModel || '';
    return {
      ANTHROPIC_BASE_URL: provider.baseUrl,
      ANTHROPIC_MODEL: model,
      ANTHROPIC_DEFAULT_SONNET_MODEL: model,
      ANTHROPIC_DEFAULT_OPUS_MODEL: model,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
      API_TIMEOUT_MS: '3000000',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    };
  }

  function doSave(apiKey: string) {
    const env = buildEnv();
    env.ANTHROPIC_AUTH_TOKEN = apiKey;
    const profile: Profile = {
      version: 1,
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      provider: name,
      env,
    };
    saveProfile(profile);
    setStep('switch-now');
  }

  function openVim() {
    const editor = process.env.EDITOR || 'vim';
    const tmpFile = path.join(os.tmpdir(), `claude-switch-${Date.now()}.json`);
    const model = selectedModel || '';
    const profileJson = JSON.stringify({
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      provider: name,
      baseUrl: provider?.baseUrl || '',
      model,
      apiKey: '<YOUR_API_KEY>',
      timeout: '3000000',
    }, null, 2);
    fs.writeFileSync(tmpFile, profileJson);
    spawnSync(editor, [tmpFile], { stdio: 'inherit' });
    const edited = fs.readFileSync(tmpFile, 'utf-8');
    fs.unlinkSync(tmpFile);
    try {
      const parsed = JSON.parse(edited);
      if (!parsed.baseUrl) {
        console.error('baseUrl is required. Profile not saved.'); process.exit(1);
      }
      const finalEnv: Record<string, string> = {
        ANTHROPIC_BASE_URL: parsed.baseUrl,
        ANTHROPIC_MODEL: parsed.model || '',
        ANTHROPIC_DEFAULT_SONNET_MODEL: parsed.model || '',
        ANTHROPIC_DEFAULT_OPUS_MODEL: parsed.model || '',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: parsed.model || '',
        API_TIMEOUT_MS: parsed.timeout || '3000000',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      };
      if (!parsed.apiKey || parsed.apiKey === '<YOUR_API_KEY>') {
        console.error('apiKey cannot be empty or a placeholder. Profile not saved.'); process.exit(1);
      }
      finalEnv.ANTHROPIC_AUTH_TOKEN = parsed.apiKey;
      const profile: Profile = {
        version: 1,
        name,
        displayName: parsed.displayName || name.charAt(0).toUpperCase() + name.slice(1),
        provider: parsed.provider || name,
        env: finalEnv,
      };
      saveProfile(profile);
      const hash = applyProfile(finalEnv);
      setActiveProfile(name, hash);
      console.log('✓ Profile "' + name + '" saved and activated.');
      process.exit(0);
    } catch (err) {
      console.error('Failed to parse edited JSON: ' + (err instanceof Error ? err.message : err)); process.exit(1);
    }
  }
}

export function runAdd(name?: string): void {
  ensureInitialized();
  if (name && !isValidProfileName(name)) {
    console.error('Invalid profile name: "' + name + '". Use lowercase alphanumeric, hyphens, dots. Max 64 chars.'); process.exit(1);
  }
  render(<AddApp initialName={name} />);
}
