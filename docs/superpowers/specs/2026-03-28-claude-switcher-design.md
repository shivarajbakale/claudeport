# Claude Switcher — Design Spec

## Overview

A global CLI tool (`claude-switch`) that lets users switch their Claude Code configuration between different AI model providers. Many providers (DeepSeek, MiniMax, Moonshot/Kimi, Qwen, Zhipu, etc.) expose Anthropic-compatible API endpoints, and Claude Code can be pointed at them by setting environment variables in `~/.claude/settings.json`. This tool automates that process.

## Problem

Manually editing `~/.claude/settings.json` every time you want to switch providers is tedious and error-prone. You have to remember the correct base URLs, model names, and env vars for each provider, and be careful not to clobber your existing permissions and plugin settings.

## Solution

A globally-installed npm CLI with an `ink`-based TUI that manages named provider profiles and merges their `env` config into `~/.claude/settings.json` on demand.

---

**Naming:** The npm package is `claude-switcher`, the CLI binary is `claude-switch`. This is intentional — the package name is the noun, the command is the verb.

## CLI Commands

| Command | Description |
|---------|-------------|
| `claude-switch` | Interactive menu — arrow-key select a profile to switch to |
| `claude-switch <name>` | Direct switch to a named profile |
| `claude-switch add [name]` | Add a new profile (web search auto-populates config) |
| `claude-switch list` | Show all profiles, highlight the active one |
| `claude-switch current` | Show which provider is currently active |
| `claude-switch reset` | Restore vanilla Claude config (no proxy env) |
| `claude-switch edit <name>` | Edit an existing profile |
| `claude-switch remove <name>` | Delete a profile |
| `claude-switch refresh-base` | Re-snapshot vanilla settings as base (must reset first if a profile is active) |
| `claude-switch version` | Show CLI version |

---

## File Structure

### Profile Storage

Individual profile files at `~/.claude-switcher/profiles/<name>.json`.

**Profile naming rules:** lowercase alphanumeric plus hyphens only, max 64 characters (e.g. `deepseek`, `minimax-m27`, `ollama-local`). Validated on creation.

```json
{
  "version": 1,
  "name": "deepseek",
  "displayName": "DeepSeek V3.2",
  "provider": "deepseek",
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-xxxxx",
    "ANTHROPIC_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-chat",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}
```

`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set to `"1"` in provider profiles to prevent Claude Code from sending telemetry/traffic to Anthropic servers when using a third-party backend.

### Base Config Backup

`~/.claude-switcher/base-settings.json` — snapshot of `~/.claude/settings.json` before any switching. Captured on first run. Used as the foundation that provider env blocks are merged onto.

### Active State Tracker

`~/.claude-switcher/state.json`:

```json
{
  "version": 1,
  "activeProfile": "deepseek",
  "lastSwitched": "2026-03-28T15:30:00Z",
  "lastWrittenHash": "sha256:abc123..."
}
```

The `lastWrittenHash` is a SHA-256 hash of the `settings.json` content as last written by the switcher. Used to detect manual edits.

---

## How `env` Works in `settings.json`

Claude Code reads environment variables from a top-level `"env"` key in `~/.claude/settings.json`. This key may not exist in a vanilla config (which typically only has `permissions` and `enabledPlugins`). The switcher adds/replaces this key.

**Before switching (vanilla):**
```json
{
  "permissions": { "allow": [...] },
  "enabledPlugins": { ... }
}
```

**After switching to DeepSeek:**
```json
{
  "permissions": { "allow": [...] },
  "enabledPlugins": { ... },
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-xxxxx",
    "ANTHROPIC_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-chat",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}
```

## Switch Operation

The merge always starts from a clean base, never from the current `settings.json`. This prevents stale env vars from a previous provider leaking through.

1. Read `~/.claude-switcher/base-settings.json` (the clean vanilla config)
2. Set the top-level `"env"` key to the selected profile's `env` object (replacing entirely, not merging additively)
3. Write the result to `~/.claude/settings.json`
4. Compute SHA-256 hash of the written file and store in `state.json`
5. Update `state.json` with the active profile name and timestamp

## Reset Operation

1. Copy `~/.claude-switcher/base-settings.json` to `~/.claude/settings.json` (this removes the `env` key entirely)
2. Clear `activeProfile` in `state.json`

The interactive menu includes a "Default Claude (vanilla)" option that triggers this reset operation.

---

## Project Architecture

```
claude-switcher/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.tsx              # Entry point — commander setup, route to commands
│   ├── commands/
│   │   ├── switch.tsx        # Interactive menu (ink) + direct switch
│   │   ├── add.tsx           # Add profile — web search + prompts
│   │   ├── list.tsx          # Show all profiles
│   │   ├── current.tsx       # Show active profile
│   │   ├── reset.tsx         # Restore vanilla config
│   │   ├── edit.tsx          # Edit existing profile
│   │   └── remove.tsx        # Delete profile
│   ├── components/
│   │   ├── ProfileSelector.tsx   # Arrow-key menu component
│   │   ├── ProfileCard.tsx       # Display a profile's details
│   │   ├── KeyInput.tsx          # Masked API key input
│   │   └── Spinner.tsx           # Loading indicator
│   ├── lib/
│   │   ├── profiles.ts       # CRUD for profile JSON files
│   │   ├── settings.ts       # Read/write/merge ~/.claude/settings.json
│   │   ├── state.ts          # Active profile state management
│   │   └── search.ts         # Web search for provider docs + parse config
│   └── types.ts              # Shared TypeScript interfaces
└── bin/
    └── claude-switch         # #!/usr/bin/env node shebang entry
```

### Dependencies

- `ink` + `react` — TUI framework
- `ink-select-input` — arrow key selection
- `ink-text-input` — text/key input
- `ink-spinner` — loading states
- `chalk` — colors
- `commander` — CLI arg parsing

### Build & Distribution

- TypeScript compiled to `dist/`
- `bin/claude-switch` points to `dist/cli.js`
- `package.json` has `"bin": { "claude-switch": "./bin/claude-switch" }`
- Install globally: `npm install -g claude-switcher`

---

## Web Search & Auto-Populate (`add` command)

When the user runs `claude-switch add <provider>`:

### Search Implementation

Uses a lightweight web search approach:
1. **Search API:** Use a free search API (e.g. DuckDuckGo Instant Answer API or scrape DuckDuckGo HTML) — no API key required
2. **Query:** `"<provider>" "claude code" ANTHROPIC_BASE_URL settings.json`
3. **Fallback query:** `"<provider>" anthropic compatible API endpoint`
4. **Extraction:** Fetch the top 3 results, look for JSON code blocks containing `ANTHROPIC_BASE_URL` using regex pattern matching. Extract the env object.
5. **Offline fallback:** If no network or search fails, drop straight into manual mode

### Add Flow

1. Run web search (with spinner)
2. If config found: present it to user for confirmation
3. If not found: enter manual mode — prompt for base URL, model name
4. Prompt for default model selection (if multiple found)
5. Prompt for API key (masked input)
6. Save profile to `~/.claude-switcher/profiles/<name>.json` with `0600` permissions
7. Offer to switch to it immediately

### Manual Mode Prompts

When web search fails:
1. "Enter the Anthropic-compatible base URL:" (e.g. `https://api.deepseek.com/anthropic`)
2. "Enter the model name:" (e.g. `deepseek-chat`)
3. "Enter your API key:" (masked)
4. "Custom timeout in ms? (default: 3000000):"

---

## Error Handling & Edge Cases

### First Run
- Create `~/.claude-switcher/` and `profiles/` subdirectory if they don't exist
- Snapshot `~/.claude/settings.json` as `base-settings.json` (or `{}` if it doesn't exist)

### Switching Safety
- Validate profile has `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` before switching
- If `ANTHROPIC_AUTH_TOKEN` is still a placeholder (`<YOUR_API_KEY>`), prompt user to enter it
- If `~/.claude/settings.json` has been manually edited since last switch (hash comparison), warn the user and offer to update the base config

### Base Config Drift
- `claude-switch refresh-base` re-snapshots the current vanilla config
- **Safety:** `refresh-base` refuses to run when a profile is active. User must `claude-switch reset` first to ensure the current `settings.json` is vanilla before re-snapshotting
- Auto-prompt if new keys are detected in `settings.json` that aren't in `base-settings.json`

### Profile Conflicts
- `claude-switch add` with an existing name asks to overwrite or pick a new name
- `claude-switch remove` on the active profile resets to vanilla first

### Key Security
- `~/.claude-switcher/` directory set to `0700`, profile files set to `0600` permissions (user-only)
- `claude-switch list` and `claude-switch current` mask API keys in output (show only last 4 chars: `sk-••••••xxxx`)
- Profile JSON files should be added to `.gitignore` if stored anywhere near a repo

### Concurrency
- This tool is not designed for concurrent use. If two terminals run `claude-switch` simultaneously, behavior is undefined. This is acceptable for a personal config tool.

### Known Limitations
- Only targets `~/.claude/settings.json` (global). Project-level `.claude/settings.json` is not managed. This could be added in a future version.

---

## Interactive Menu UX

```
┌─────────────────────────────────────┐
│  Claude Switcher                    │
│                                     │
│  Select a provider:                 │
│                                     │
│  ● DeepSeek          (active)       │
│  ○ MiniMax M2.7                     │
│  ○ Kimi K2.5                        │
│  ○ Qwen 3.5                         │
│  ○ Ollama (local)                   │
│  ○ Default Claude    (vanilla)      │
│                                     │
│  ↑↓ Navigate  ⏎ Select  q Quit     │
└─────────────────────────────────────┘
```

## Add Profile UX

```
$ claude-switch add deepseek

  ⠋ Searching for DeepSeek Claude Code configuration...

  ✓ Found configuration from api-docs.deepseek.com

  ┌──────────────────────────────────────────────┐
  │  Provider: DeepSeek                          │
  │  Base URL: https://api.deepseek.com/anthropic│
  │  Models:   deepseek-chat, deepseek-reasoner  │
  │  Timeout:  3000000ms                         │
  └──────────────────────────────────────────────┘

  ? Use this configuration? (Y/n) Y
  ? Select default model: deepseek-chat
  ? Enter your API key: ••••••••••••••••

  ✓ Profile "deepseek" saved!
  ? Switch to it now? (Y/n)
```
