import { Router } from 'express';
import { execFile } from 'child_process';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
import type { SessionStore } from './session-store.js';

const require = createRequire(import.meta.url);
const PKG_NAME = 'claude-dump';
const CURRENT_VERSION: string = require('../../../package.json').version;

let cachedLatest: { version: string; checkedAt: number } | null = null;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function getLatestVersion(): Promise<string | null> {
  if (cachedLatest && Date.now() - cachedLatest.checkedAt < CACHE_TTL) {
    return cachedLatest.version;
  }
  try {
    const res = await fetch(`https://registry.npmjs.org/${PKG_NAME}/latest`);
    if (!res.ok) return null;
    const data = await res.json();
    cachedLatest = { version: data.version, checkedAt: Date.now() };
    return data.version;
  } catch {
    return null;
  }
}

export function createRoutes(store: SessionStore): Router {
  const router = Router();

  router.get('/projects', async (_req, res) => {
    try {
      const projects = await store.getProjects();
      res.json(projects);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load projects' });
    }
  });

  router.get('/projects/:projectId/sessions', async (req, res) => {
    try {
      const sessions = await store.getSessions(req.params.projectId);
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load sessions' });
    }
  });

  router.get('/projects/:projectId/sessions/:sessionId', async (req, res) => {
    try {
      const turns = await store.getSessionTurns(
        req.params.projectId,
        req.params.sessionId
      );
      res.json(turns);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load session' });
    }
  });

  const EDITORS: Record<string, string> = {
    cursor: 'cursor',
    vscode: 'code',
  };

  router.post('/open-in-editor', (req, res) => {
    const { path, editor } = req.body;
    if (!path || typeof path !== 'string') {
      res.status(400).json({ error: 'Missing path' });
      return;
    }
    const cmd = EDITORS[editor];
    if (!cmd) {
      res.status(400).json({ error: `Unknown editor: ${editor}` });
      return;
    }
    execFile(cmd, [path], (err) => {
      if (err) {
        res.status(500).json({ error: `Failed to open ${editor}` });
        return;
      }
      res.json({ ok: true });
    });
  });

  router.post('/open-in-terminal', (req, res) => {
    const { sessionId, projectPath } = req.body;
    if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9-]+$/.test(sessionId)) {
      res.status(400).json({ error: 'Invalid sessionId' });
      return;
    }
    const shell = process.env.SHELL || '/bin/zsh';
    const cdLine = projectPath && typeof projectPath === 'string'
      ? `cd '${projectPath.replace(/'/g, "'\\''")}'\n`
      : '';
    const scriptPath = join(tmpdir(), `claude-resume-${sessionId}.command`);
    const scriptContent = `#!${shell} -l\nrm -f '${scriptPath.replace(/'/g, "\\'")}'\nunset COLORTERM\n${cdLine}claude --resume ${sessionId}\n`;
    try {
      writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
    } catch {
      res.status(500).json({ error: 'Failed to create launch script' });
      return;
    }
    execFile('open', [scriptPath], (err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to open terminal' });
        return;
      }
      res.json({ ok: true });
    });
  });

  router.post('/open-in-terminal-new', (req, res) => {
    const { projectPath } = req.body;
    if (!projectPath || typeof projectPath !== 'string') {
      res.status(400).json({ error: 'Missing projectPath' });
      return;
    }
    const shell = process.env.SHELL || '/bin/zsh';
    const safePath = projectPath.replace(/'/g, "'\\''");
    const scriptPath = join(tmpdir(), `claude-new-${Date.now()}.command`);
    const scriptContent = `#!${shell} -l\nrm -f '${scriptPath.replace(/'/g, "\\'")}'\nunset COLORTERM\ncd '${safePath}'\nclaude\n`;
    try {
      writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
    } catch {
      res.status(500).json({ error: 'Failed to create launch script' });
      return;
    }
    execFile('open', [scriptPath], (err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to open terminal' });
        return;
      }
      res.json({ ok: true });
    });
  });

  router.get('/version', async (_req, res) => {
    const latest = await getLatestVersion();
    res.json({ current: CURRENT_VERSION, latest });
  });

  return router;
}
