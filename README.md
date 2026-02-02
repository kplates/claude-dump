# claude-dump

Real-time web viewer for your [Claude Code](https://docs.anthropic.com/en/docs/claude-code) conversation history.

Browse and review past Claude Code sessions in a live-updating web interface — with syntax highlighting, diff views for file edits, and collapsible thinking blocks.

## Install

```bash
npm install -g claude-dump
```

## Usage

```bash
claude-dump
```

This starts a local server and opens the viewer in a standalone window (no URL bar) at `http://localhost:3456`. If Chrome or another Chromium-based browser is installed, it launches in app mode automatically.

### Arguments

```
claude-dump [path] [options]
```

| Argument / Option | Default              | Description                          |
| ----------------- | -------------------- | ------------------------------------ |
| `path`            | `~/.claude/projects` | Path to Claude projects directory    |
| `--port <port>`   | `3456`               | Port for the web server              |
| `--no-open`       |                      | Don't open the browser automatically |
| `-h, --help`      |                      | Show help message                    |

Examples:

```bash
# Default — reads from ~/.claude/projects
claude-dump

# Custom projects directory
claude-dump /path/to/projects

# Custom port
claude-dump --port 8080

# Both
claude-dump /path/to/projects --port 8080
```

## Features

- **Standalone window** — opens in a chromeless app window (Chrome/Edge); also installable as a PWA
- **Live updates** — conversations stream in real-time as you use Claude Code
- **Project browser** — sidebar lists all your Claude Code projects and sessions
- **Split panes** — open multiple sessions side-by-side (up to 4)
- **Light / dark mode** — toggle between themes, preference is saved
- **Open in editor** — open a project in Cursor or VS Code directly from the viewer
- **Open in terminal** — resume any session in a new terminal window with one click
- **Recent activity** — recent chats section with live activity badges and relative timestamps
- **Syntax highlighting** — code blocks are highlighted automatically
- **Diff views** — file edits and writes render as unified diffs
- **Thinking blocks** — collapsible extended thinking sections
- **Tool call rendering** — specialized views for Bash, Edit, Write, Read, Glob, and Grep tools
- **Session metadata** — timestamps, git branch, model info, and message counts
- **Update notifications** — banner appears when a newer version is available on npm

## How it works

claude-dump reads from `~/.claude/projects/` (or a custom path), where Claude Code stores conversation history as JSONL files. It watches for changes and pushes updates to the browser over WebSocket.

## Development

```bash
git clone https://github.com/kplates/claude-dump.git
cd claude-dump
npm install
npm run dev
```

### Build

```bash
npm run build
npm start
```

### Release

```bash
npm run release:patch   # 0.1.0 → 0.1.1
npm run release:minor   # 0.1.0 → 0.2.0
npm run release:major   # 0.1.0 → 1.0.0
```

## License

MIT
