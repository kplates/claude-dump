# claude-dummp

Real-time web viewer for your [Claude Code](https://docs.anthropic.com/en/docs/claude-code) conversation history.

Browse, search, and review past Claude Code sessions in a live-updating web interface — with syntax highlighting, diff views for file edits, and collapsible thinking blocks.

## Install

```bash
npm install -g claude-dummp
```

## Usage

```bash
claude-dummp
```

This starts a local server and opens the viewer in your browser at `http://localhost:3456`.

### Options

| Environment Variable | Default | Description |
|---|---|---|
| `PORT` | `3456` | Port for the web server |

Example:

```bash
PORT=8080 claude-dummp
```

## Features

- **Live updates** — conversations stream in real-time as you use Claude Code
- **Project browser** — sidebar lists all your Claude Code projects and sessions
- **Syntax highlighting** — code blocks are highlighted automatically
- **Diff views** — file edits and writes render as unified diffs
- **Thinking blocks** — collapsible extended thinking sections
- **Tool call rendering** — specialized views for Bash, Edit, Write, Read, Glob, and Grep tools
- **Session metadata** — timestamps, git branch, model info, and message counts

## How it works

claude-dummp reads from `~/.claude/projects/`, where Claude Code stores conversation history as JSONL files. It watches for changes and pushes updates to the browser over WebSocket.

## Development

```bash
git clone https://github.com/your-username/claude-dummp.git
cd claude-dummp
npm install
npm run dev
```

### Build

```bash
npm run build
npm start
```

## License

MIT
