import { Router } from 'express';
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

  return router;
}
