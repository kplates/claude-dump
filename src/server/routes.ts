import { Router } from 'express';
import { execFile } from 'child_process';
import type { SessionStore } from './session-store.js';

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

  return router;
}
