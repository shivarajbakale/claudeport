# claudeport

**Switch Claude Code between AI providers in one command.**

Stop hunting through `settings.json`. Stop pasting base URLs from docs. Stop guessing which env var is which. `claudeport` handles the config so you can focus on the actual work.

```bash
claudeport add deepseek   # add profile
claudeport deepseek       # switch to it
```

> Works with DeepSeek, MiniMax, Groq, Moonshot, OpenRouter, and any Anthropic-compatible endpoint. One command to add, one command to switch.

---

## Why

Claude Code is excellent — but the right model depends on the task:

| Use case | Best fit |
|----------|----------|
| General coding | **DeepSeek** — best price/performance |
| Fast feedback loops | **Groq** — sub-second first token |
| Long documents / large diffs | **Moonshot** — 128k context |
| Budget at scale | **MiniMax M2.7** — MoE architecture |
| Any model on demand | **OpenRouter** — 100+ models |

No switching cost. No commitment. No "which config was I using again?"

---

## Install

```bash
npm install -g @shivarajbakale/claudeport
```

Requires Node.js 18+.

---

## Add your first profile

```bash
claudeport add deepseek
```

- You type `deepseek`
- `claudeport` auto-fills the endpoint URL and default model
- You paste your API key
- Done.

```bash
# Add more providers
claudeport add groq
claudeport add minimax
claudeport add moonshot
```

---

## Switch instantly

```bash
claudeport deepseek       # by name
claudeport                 # or pick from a menu
```

Claude Code picks up the new config immediately. No restart needed.

---

## Features

### Named switching
```bash
claudeport <name>
```
Short. Fast. Tab-completable.

### Interactive menu
```bash
claudeport
```
Don't remember the profile name? Pick from a list.

### Built-in provider knowledge
Run `claudeport add <name>` with any known provider name and the correct endpoint and model are pre-filled. No docs hunting.

### Vim editing
```bash
claudeport add <name>   # select provider
# choose "Edit in vim"
```
Review and edit the raw JSON config before saving. Useful for custom settings or obscure providers.

### Profile management
```bash
claudeport list          # show all profiles
claudeport remove <name> # delete one
claudeport edit <name>   # edit one
claudeport current        # show active profile
claudeport reset         # restore original settings
```

### Safe and non-destructive
`claudeport` backs up your original `~/.claude/settings.json` and only touches the `env` keys it needs. Your prompts, keybindings, and other settings stay intact.

---

## Supported providers

| Provider | Endpoint | Models |
|----------|----------|--------|
| **DeepSeek** | `https://api.deepseek.com/anthropic` | `deepseek-chat`, `deepseek-reasoner` |
| **MiniMax** | `https://api.minimax.io/anthropic` | `MiniMax-M2.7` |
| **Moonshot (Kimi)** | `https://api.moonshot.cn/v1` | `moonshot-v1-8k`, `-32k`, `-128k` |
| **OpenRouter** | `https://openrouter.ai/api/v1` | 100+ models |
| **Groq** | `https://api.groq.com/openai/v1` | Llama 3.3, Llama 3.1, Mixtral 8x7B, Gemma 2 |

All are verified Anthropic Messages API-compatible. Don't see yours? Adding a new provider is a ~10 line change.

---

## How it works

Claude Code reads from the `env` block in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_MODEL": "deepseek-chat"
  }
}
```

`claudeport` stores profiles in `~/.claude-switcher/profiles/`. Activating a profile merges its env into `settings.json`. Your original config is always preserved as a backup.

---

## Uninstall

```bash
npm uninstall -g @shivarajbakale/claudeport
```

Your `~/.claude-switcher/` profiles and original `~/.claude/settings.json` are left untouched.

---

## Contributing

Found a provider that supports the Anthropic API? Add it in seconds:

```typescript
// src/lib/providers.ts
{
  name: 'myprovider',
  displayName: 'My Provider',
  baseUrl: 'https://api.myprovider.com/anthropic',
  models: ['model-v1', 'model-v2'],
  docsUrl: 'https://docs.myprovider.com',
}
```

Dev setup:

```bash
git clone https://github.com/shivarajbakale/claudeport.git
cd claudeport
npm install
npm run build
npm link    # run locally
npm test
```

---

## License

MIT
