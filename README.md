# claudeport

**One command to switch Claude Code between AI providers.**

No hunting through `settings.json`. No guessing env var names. No restarts.

```
claudeport deepseek   # switch instantly
claudeport            # or pick from a pretty menu
```

---

## The Problem

Claude Code is brilliant. But switching models means:
- Hunting through `settings.json` for the right `env` keys
- Googling "what's the DeepSeek endpoint again?"
- Wondering if it was `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN`
- Restarting Claude Code for changes to take effect

**claudeport** eliminates all of that.

---

## Install

```bash
npm install -g @shivarajbakale/claudeport
```

Requires Node.js 18+.

---

## Quick Start

```bash
claudeport add deepseek  # interactive setup, auto-fills endpoint + model
claudeport deepseek       # switch to it
```

Claude Code picks up the new config immediately. No restart needed.

---

## Interactive Mode

Run `claudeport` without arguments for a visual picker:

```
┌─ claudeport ──────────────────────────┐
│                                     │
│  ▶  deepseek (deepseek-chat)        │
│     groq (llama-3.3-70b-versatile)   │
│     minimax (MiniMax-M2.7)           │
│     moonshot (moonshot-v1-128k)      │
│     openrouter (100+ models)         │
│                                     │
│     + add new profile                │
│                                     │
└─────────────────────────────────────┘
```

Tab-completable for speed, vim keybindings for navigation.

---

## Why claudeport

Different tasks need different models:

| Use case | Best fit |
|----------|----------|
| General coding | **DeepSeek** — best price/performance |
| Fast feedback | **Groq** — sub-second first token |
| Long docs/diffs | **Moonshot** — 128k context |
| Budget at scale | **MiniMax M2.7** — MoE architecture |
| Any model on demand | **OpenRouter** — 100+ models |

No switching cost. No commitment. Pick the right tool for the job.

---

## Commands

| Command | Description |
|---------|-------------|
| `claudeport <name>` | Switch to profile (tab-completable) |
| `claudeport` | Interactive profile picker |
| `claudeport add <name>` | Add a new provider profile |
| `claudeport list` | List all profiles |
| `claudeport current` | Show active profile |
| `claudeport edit <name>` | Edit a profile |
| `claudeport remove <name>` | Delete a profile |
| `claudeport reset` | Restore original settings |

---

## Supported Providers

| Provider | Endpoint | Models |
|----------|----------|--------|
| **DeepSeek** | `api.deepseek.com` | `deepseek-chat`, `deepseek-reasoner` |
| **MiniMax** | `api.minimax.io` | `MiniMax-M2.7` |
| **Moonshot** | `api.moonshot.cn` | `moonshot-v1-8k`, `-32k`, `-128k` |
| **OpenRouter** | `openrouter.ai` | 100+ models |
| **Groq** | `api.groq.com` | Llama 3.3, Llama 3.1, Mixtral, Gemma 2 |

All verified Anthropic Messages API-compatible. Don't see yours? Adding a new provider is a ~10 line change.

---

## Safe and Non-Destructive

`claudeport` backs up your original `~/.claude/settings.json` before touching anything. It only modifies the `env` keys it needs — your prompts, keybindings, and other settings stay intact.

```
~/.claude-switcher/
├── profiles/       # your saved profiles
└── base.json       # original settings (backup)
```

---

## How It Works

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

`claudeport` stores profiles in `~/.claude-switcher/profiles/`. Activating a profile merges its config into `settings.json`. Your original is always preserved as `base.json`.

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
