import * as pty from 'node-pty';
import { execSync } from 'child_process';

// Try to find the claude command path
function findClaudePath(): string {
  try {
    return execSync('which claude', { encoding: 'utf-8' }).trim();
  } catch {
    return 'claude'; // Fall back to just 'claude' and hope it's in PATH
  }
}

const CLAUDE_PATH = findClaudePath();

export class TerminalManager {
  private terminals = new Map<string, pty.IPty>();

  create(
    sessionId: string,
    projectPath: string,
    onData: (data: string) => void,
    onExit: (code: number) => void,
    resume: boolean = true
  ): void {
    // Close existing terminal for this session if any
    this.close(sessionId);

    const args = resume ? ['--resume', sessionId] : [];
    console.log(`[terminal] spawning ${CLAUDE_PATH} ${args.join(' ')} in ${projectPath}`);

    try {
      // Build environment - ensure PATH includes common locations
      const env = { ...process.env } as Record<string, string>;
      // Remove COLORTERM as it can cause issues with Claude's terminal detection
      delete env.COLORTERM;

      const term = pty.spawn(CLAUDE_PATH, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: projectPath,
        env,
      });

      term.onData(onData);
      term.onExit(({ exitCode }) => {
        console.log(`[terminal] session ${sessionId} exited with code ${exitCode}`);
        this.terminals.delete(sessionId);
        onExit(exitCode);
      });

      this.terminals.set(sessionId, term);
    } catch (err) {
      console.error(`[terminal] failed to spawn:`, err);
      onExit(1);
    }
  }

  write(sessionId: string, data: string): void {
    const term = this.terminals.get(sessionId);
    if (term) {
      term.write(data);
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const term = this.terminals.get(sessionId);
    if (term) {
      term.resize(cols, rows);
    }
  }

  close(sessionId: string): void {
    const term = this.terminals.get(sessionId);
    if (term) {
      term.kill();
      this.terminals.delete(sessionId);
    }
  }

  closeAll(): void {
    for (const [sessionId] of this.terminals) {
      this.close(sessionId);
    }
  }

  has(sessionId: string): boolean {
    return this.terminals.has(sessionId);
  }
}
