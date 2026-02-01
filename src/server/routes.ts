import { Router } from 'express';
import { execFile } from 'child_process';
import { createRequire } from 'module';
import type { SessionStore } from './session-store.js';

const require = createRequire(import.meta.url);
const PKG_NAME = 'claude-dump';
const CURRENT_VERSION: string = require('../../package.json').version;

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

  router.get('/version', async (_req, res) => {
    const latest = await getLatestVersion();
    res.json({ current: CURRENT_VERSION, latest });
  });

  return router;
}
