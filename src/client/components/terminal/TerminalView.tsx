import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { ClientMessage, ServerMessage } from '@shared/protocol';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  sessionId: string;
  projectPath: string;
  onClose: () => void;
  resume?: boolean;
}

export function TerminalView({ sessionId, projectPath, onClose, resume = true }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      theme: {
        background: '#1a1a1a',
        foreground: '#e5e5e5',
        cursor: '#e5e5e5',
        cursorAccent: '#1a1a1a',
        selectionBackground: '#4a4a4a',
        black: '#1a1a1a',
        red: '#ff6b6b',
        green: '#69db7c',
        yellow: '#fcc419',
        blue: '#4dabf7',
        magenta: '#da77f2',
        cyan: '#66d9e8',
        white: '#e5e5e5',
        brightBlack: '#4a4a4a',
        brightRed: '#ff8787',
        brightGreen: '#8ce99a',
        brightYellow: '#ffd43b',
        brightBlue: '#74c0fc',
        brightMagenta: '#e599f7',
        brightCyan: '#99e9f2',
        brightWhite: '#ffffff',
      },
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle Shift+Enter to insert newline instead of submitting
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type === 'keydown' && event.key === 'Enter' && event.shiftKey) {
        // Send a literal newline character for Shift+Enter
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputMsg: ClientMessage = {
            type: 'terminal_input',
            sessionId,
            data: '\n',
          };
          wsRef.current.send(JSON.stringify(inputMsg));
        }
        return false; // Prevent default Enter handling
      }
      return true; // Allow other keys to be processed normally
    });

    // Focus the terminal
    terminal.focus();

    // Connect to WebSocket for terminal I/O
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Start the terminal session
      const startMsg: ClientMessage = {
        type: 'terminal_start',
        sessionId,
        projectPath,
        resume,
      };
      ws.send(JSON.stringify(startMsg));

      // Send initial size
      const resizeMsg: ClientMessage = {
        type: 'terminal_resize',
        sessionId,
        cols: terminal.cols,
        rows: terminal.rows,
      };
      ws.send(JSON.stringify(resizeMsg));
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === 'terminal_output' && msg.sessionId === sessionId) {
          terminal.write(msg.data);
        } else if (msg.type === 'terminal_exit' && msg.sessionId === sessionId) {
          terminal.write(`\r\n\x1b[90m[Process exited with code ${msg.code}]\x1b[0m\r\n`);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      terminal.write('\r\n\x1b[90m[Connection closed]\x1b[0m\r\n');
    };

    // Handle terminal input
    const dataDisposable = terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        const inputMsg: ClientMessage = {
          type: 'terminal_input',
          sessionId,
          data,
        };
        ws.send(JSON.stringify(inputMsg));
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit();
        if (ws.readyState === WebSocket.OPEN) {
          const resizeMsg: ClientMessage = {
            type: 'terminal_resize',
            sessionId,
            cols: terminalRef.current.cols,
            rows: terminalRef.current.rows,
          };
          ws.send(JSON.stringify(resizeMsg));
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      if (ws.readyState === WebSocket.OPEN) {
        const closeMsg: ClientMessage = {
          type: 'terminal_close',
          sessionId,
        };
        ws.send(JSON.stringify(closeMsg));
      }
      ws.close();
      terminal.dispose();
    };
  }, [sessionId, projectPath]);

  return (
    <div className="flex flex-col bg-[#1a1a1a] border-b border-claude-border">
      <div className="flex items-center justify-between px-3 py-1 bg-claude-surface border-b border-claude-border">
        <span className="text-xs text-claude-muted">Claude Chat</span>
        <button
          onClick={onClose}
          className="text-xs text-claude-muted hover:text-claude-text px-2 py-0.5 rounded hover:bg-claude-border/50 transition-colors"
        >
          Close
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-[200px] max-h-[400px] p-2 overflow-hidden"
        style={{ height: '300px' }}
      />
    </div>
  );
}
