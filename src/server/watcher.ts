import chokidar from 'chokidar';
import path from 'path';
import type { SessionStore } from './session-store.js';

type ChangeCallback = (event: WatchEvent) => void;

export type WatchEvent =
  | { type: 'session_changed'; projectId: string; sessionId: string }
  | { type: 'index_changed'; projectId: string }
  | { type: 'new_session'; projectId: string; sessionId: string };

export class ProjectWatcher {
  private watcher: ReturnType<typeof chokidar.watch> | null = null;
  private callbacks: ChangeCallback[] = [];

  constructor(private store: SessionStore) {}

  start(): void {
    const projectsDir = this.store.getProjectsDir();

    this.watcher = chokidar.watch(projectsDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 3,
      usePolling: true,
      interval: 500,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });

    this.watcher.on('change', (filePath: string) => {
      this.handleChange(filePath);
    });

    this.watcher.on('add', (filePath: string) => {
      this.handleAdd(filePath);
    });
  }

  onChange(callback: ChangeCallback): void {
    this.callbacks.push(callback);
  }

  stop(): void {
    this.watcher?.close();
  }

  private handleChange(filePath: string): void {
    const projectsDir = this.store.getProjectsDir();
    const relative = path.relative(projectsDir, filePath);
    const parts = relative.split(path.sep);

    if (parts.length < 2) return;
    const projectId = parts[0];

    if (parts[1] === 'sessions-index.json') {
      this.emit({ type: 'index_changed', projectId });
      return;
    }

    if (parts[1].endsWith('.jsonl')) {
      const sessionId = parts[1].replace('.jsonl', '');
      this.emit({ type: 'session_changed', projectId, sessionId });
    }
  }

  private handleAdd(filePath: string): void {
    const projectsDir = this.store.getProjectsDir();
    const relative = path.relative(projectsDir, filePath);
    const parts = relative.split(path.sep);

    if (parts.length < 2) return;
    const projectId = parts[0];

    if (parts[1].endsWith('.jsonl')) {
      const sessionId = parts[1].replace('.jsonl', '');
      this.emit({ type: 'new_session', projectId, sessionId });
    }
  }

  private emit(event: WatchEvent): void {
    for (const cb of this.callbacks) {
      cb(event);
    }
  }
}
