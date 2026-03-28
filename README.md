# claudeport

**One command to switch Claude Code between AI model providers.**

Claude Code is powerful — but it's even better when you can pick the right model for the right task. `claudeport` lets you flip between DeepSeek, MiniMax, Groq, Moonshot, OpenRouter, and more in seconds — no manual config editing, no settings.json archaeology.

```bash
# Install
npm install -g claudeport

# Switch to DeepSeek
claudeport add deepseek

# Switch to MiniMax
claudeport add minimax

# Switch to Groq
claudeport add groq

# Use it
claudeport deepseek    # activate by name
claudeport             # interactive menu
```

---

## Why

| Task | Best Provider |
|------|--------------|
| Code generation & refactors | **DeepSeek** — best price/performance |
| Fast prototyping | **Groq** — fastest inference |
| Long context tasks | **Moonshot** — 128k context window |
| Budget scaling | **MiniMax M2.7** — MoE at low cost |
| Model flexibility | **OpenRouter** — 100+ models |

No lock-in. No commitment. Just pick the right tool for the job.

---

## Quick Start

### 1. Install

```bash
npm install -g claudeport
```

Requires Node.js 18+.

### 2. Add a profile

```bash
claudeport add deepseek
```

You'll be prompted for your API key. That's it — the tool handles everything else.

### 3. Start using it

```bash
claudeport deepseek    # by profile name
claudeport             # pick from menu
```

Claude Code picks up the new config immediately. No restart needed.

---

## Supported Providers

| Provider | Endpoint | Models |
|----------|----------|--------|
| **DeepSeek** | `https://api.deepseek.com/anthropic` | `deepseek-chat`, `deepseek-reasoner` |
| **MiniMax** | `https://api.minimax.io/anthropic` | `MiniMax-M2.7` |
| **Moonshot (Kimi)** | `https://api.moonshot.cn/v1` | `moonshot-v1-8k`, `-32k`, `-128k` |
| **OpenRouter** | `https://openrouter.ai/api/v1` | 100+ models |
| **Groq** | `https://api.groq.com/openai/v1` | Llama 3.3, Llama 3.1, Mixtral, Gemma 2 |

All providers expose the Anthropic Messages API — Claude Code works with them out of the box via `ANTHROPIC_BASE_URL`.

Don't see your provider? Open an issue or PR — adding a new provider is a one-line change.

---

## Features

### Named profile switching

```bash
claudeport <name>
```

Short, memorable, fast. Works with tab completion.

### Interactive menu

```bash
claudeport
```

Pick from a list when you don't remember the exact profile name.

### Built-in profiles

Run `claudeport add <name>` with any known provider name and the correct endpoint and default model are pre-filled. No docs hunting required.

### Vim editing

```bash
claudeport add <name>   # select provider
# ... choose "Edit in vim"
```

Review and edit the raw JSON config before saving. Useful for custom timeouts, environment variables, or obscure providers.

### Profile management

```bash
claudeport list         # show all profiles
claudeport remove <n>  # delete a profile
claudeport edit <n>    # edit a profile
```

### Clean base config

`claudeport` maintains a backup of your original `~/.claude/settings.json` and only touches the `env` keys it needs. Your custom prompts, keybindings, and other settings are preserved.

---

## How it works

Claude Code reads environment variables from the top-level `env` key in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_MODEL": "deepseek-chat"
  }
}
```

`claudeport` stores each profile as a JSON file in `~/.claudeport/profiles/`. When you activate a profile, it merges the profile's `env` into `settings.json`. Your original settings are always preserved as a base backup.

---

## Managing multiple providers

You can have unlimited profiles. Common setup:

```bash
claudeport add deepseek --api-key sk-...    # coding work
claudeport add groq --api-key gsk_...       # fast prototyping
claudeport add moonshot --api-key ...       # long documents

claudeport deepseek   # switch instantly
```

---

## Uninstall

```bash
npm uninstall -g claudeport
```

Your `~/.claudeport/` directory and original `~/.claude/settings.json` are left intact.

---

## Contributing

Contributions welcome! Here's how to set up for development:

```bash
git clone https://github.com/YOUR_HANDLE/claudeport.git
cd claudeport
npm install
npm run build
npm link   # symlink the CLI locally
```

Run tests:

```bash
npm test
```

### Adding a new provider

Edit `src/lib/providers.ts` — it's a simple array:

```typescript
{
  name: 'myprovider',
  displayName: 'My Provider',
  baseUrl: 'https://api.myprovider.com/anthropic',
  models: ['model-v1', 'model-v2'],
  docsUrl: 'https://docs.myprovider.com',
}
```

---

## License

MIT
