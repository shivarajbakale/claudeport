import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
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
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type Step = 'name-prompt' | 'searching' | 'confirm' | 'manual-url' | 'manual-model' | 'api-key' | 'overwrite' | 'switch-now' | 'done';

function AddApp({ initialName }: { initialName?: string }) {
  const [step, setStep] = useState<Step>(initialName ? 'searching' : 'name-prompt');
  const [name, setName] = useState(initialName || '');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (step === 'searching' && name) {
      searchProviderConfig(name).then(result => {
        if (result) {
          const defaultModel = result.models[0] || '';
          setSearchResult(result);
          setEnv({
            ...result.env,
            ANTHROPIC_MODEL: defaultModel,
            ANTHROPIC_DEFAULT_SONNET_MODEL: defaultModel,
            ANTHROPIC_DEFAULT_OPUS_MODEL: defaultModel,
            ANTHROPIC_DEFAULT_HAIKU_MODEL: defaultModel,
          });
          setStep('confirm');
        } else {
          setStep('manual-url');
        }
      });
    }
  }, [step, name]);

  if (step === 'name-prompt') {
    return (<Box padding={1}><Text>Profile name (lowercase, hyphens/dots ok): </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(val) => {
      if (!isValidProfileName(val)) { setMessage('Invalid name. Use lowercase alphanumeric, hyphens, dots. Max 64 chars.'); setStep('done'); return; }
      setName(val); setInputValue(''); setStep('searching');
    }} /></Box>);
  }

  if (step === 'searching') { return (<Box padding={1}><Text><Spinner type="dots" /> Searching for {name} Claude Code configuration...</Text></Box>); }

  if (step === 'confirm' && searchResult) {
    return (<Box flexDirection="column" padding={1}>
      <Text color="green">✓ Found configuration from {searchResult.source}{'\n'}</Text>
      <Text>Base URL: <Text color="cyan">{env.ANTHROPIC_BASE_URL}</Text></Text>
      <Text>Model:    <Text color="yellow">{env.ANTHROPIC_MODEL || '(none found)'}</Text></Text>
      <Text dimColor>All available: {searchResult.models.join(', ')}{'\n'}</Text>
      <Text>What would you like to do?</Text>
      <SelectInput items={[
        { label: 'Looks good — add API key', value: 'continue' },
        { label: 'Edit in vim', value: 'vim' },
        { label: 'Enter manually from scratch', value: 'manual-url' },
      ]} onSelect={(item) => {
        if (item.value === 'continue') { setStep('api-key'); }
        else if (item.value === 'vim') { openVim(name, env, searchResult); }
        else { setStep('manual-url'); }
      }} />
    </Box>);
  }

  if (step === 'manual-url') { return (<Box padding={1}><Text>Enter the Anthropic-compatible base URL: </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(url) => { setEnv(prev => ({ ...prev, ANTHROPIC_BASE_URL: url })); setInputValue(''); setStep('manual-model'); }} /></Box>); }
  if (step === 'manual-model') { return (<Box padding={1}><Text>Enter the model name: </Text><TextInput value={inputValue} onChange={setInputValue} onSubmit={(model) => { setEnv(prev => ({ ...prev, ANTHROPIC_MODEL: model, ANTHROPIC_DEFAULT_SONNET_MODEL: model, ANTHROPIC_DEFAULT_OPUS_MODEL: model, ANTHROPIC_DEFAULT_HAIKU_MODEL: model })); setInputValue(''); openVim(name, { ...env, ANTHROPIC_MODEL: model }); }} /></Box>); }

  if (step === 'api-key') {
    return (<Box padding={1}><KeyInput label="Enter your API key:" onSubmit={(key) => {
      const apiKey = key || '<YOUR_API_KEY>';
      setEnv(prev => ({ ...prev, ANTHROPIC_AUTH_TOKEN: apiKey }));
      if (profileExists(name)) { setStep('overwrite'); } else { doSave(apiKey); }
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
        onSelect={(item) => {
          if (item.value === 'yes') { const hash = applyProfile(env); setActiveProfile(name, hash); setMessage('✓ Switched to ' + name + '.'); }
          else { setMessage('Profile saved. Switch later with: claude-switch ' + name); }
          setStep('done');
        }} />
    </Box>);
  }
  if (step === 'done') { return (<Box padding={1}><Text>{message}</Text></Box>); }
  return null;

  function doSave(apiKey: string) {
    const profile: Profile = {
      version: 1,
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      provider: name,
      env: { ...env, ANTHROPIC_AUTH_TOKEN: apiKey },
    };
    saveProfile(profile);
    setStep('switch-now');
  }

  function openVim(profileName: string, currentEnv: Record<string, string>, sr?: SearchResult | null) {
    const editor = process.env.EDITOR || 'vim';
    const tmpFile = path.join(os.tmpdir(), `claude-switch-${Date.now()}.json`);
    const profileJson = JSON.stringify({
      name: profileName,
      displayName: profileName.charAt(0).toUpperCase() + profileName.slice(1),
      provider: profileName,
      env: {
        ANTHROPIC_BASE_URL: currentEnv.ANTHROPIC_BASE_URL || '',
        ANTHROPIC_AUTH_TOKEN: currentEnv.ANTHROPIC_AUTH_TOKEN || '<YOUR_API_KEY>',
        ANTHROPIC_MODEL: currentEnv.ANTHROPIC_MODEL || '',
        ANTHROPIC_DEFAULT_SONNET_MODEL: currentEnv.ANTHROPIC_MODEL || '',
        ANTHROPIC_DEFAULT_OPUS_MODEL: currentEnv.ANTHROPIC_MODEL || '',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: currentEnv.ANTHROPIC_MODEL || '',
        API_TIMEOUT_MS: currentEnv.API_TIMEOUT_MS || '3000000',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: currentEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC || '1',
      },
    }, null, 2);
    fs.writeFileSync(tmpFile, profileJson);
    spawnSync(editor, [tmpFile], { stdio: 'inherit' });
    const edited = fs.readFileSync(tmpFile, 'utf-8');
    fs.unlinkSync(tmpFile);
    try {
      const parsed = JSON.parse(edited);
      if (!parsed.env || !parsed.env.ANTHROPIC_BASE_URL) {
        console.error('ANTHROPIC_BASE_URL is required in the config. Profile not saved.');
        process.exit(1);
      }
      // Ensure ANTHROPIC_AUTH_TOKEN has a value
      if (!parsed.env.ANTHROPIC_AUTH_TOKEN || parsed.env.ANTHROPIC_AUTH_TOKEN === '<YOUR_API_KEY>') {
        console.error('ANTHROPIC_AUTH_TOKEN cannot be empty or a placeholder. Profile not saved.');
        process.exit(1);
      }
      const finalEnv: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.env)) {
        if (typeof v === 'string' && v !== '') finalEnv[k] = v;
      }
      const profile: Profile = {
        version: 1,
        name: profileName,
        displayName: parsed.displayName || profileName.charAt(0).toUpperCase() + profileName.slice(1),
        provider: parsed.provider || profileName,
        env: finalEnv,
      };
      saveProfile(profile);
      console.log('✓ Profile "' + profileName + '" saved.');
      // Optionally switch immediately
      const hash = applyProfile(finalEnv);
      setActiveProfile(profileName, hash);
      console.log('✓ Switched to ' + profileName + '.');
      process.exit(0);
    } catch (err) {
      console.error('Failed to parse edited JSON: ' + (err instanceof Error ? err.message : err));
      process.exit(1);
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
