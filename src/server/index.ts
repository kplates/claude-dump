import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { SessionStore } from './session-store.js';
import { ProjectWatcher } from './watcher.js';
import { createRoutes } from './routes.js';
import type { ClientMessage, ServerMessage } from '../shared/protocol.js';

const PORT = parseInt(process.env.PORT || '3456', 10);
const isDev = process.env.NODE_ENV !== 'production';

async function main() {
  const app = express();
  const server = http.createServer(app);

  // Session store
  const store = new SessionStore();

  // REST API
  app.use('/api', createRoutes(store));

  // WebSocket server (noServer mode to avoid conflicts with Vite HMR)
  const wss = new WebSocketServer({ noServer: true });

  // Vite dev server or static files
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Wrap upgrade handlers AFTER Vite registers its own, so we can
    // exclusively route /ws to our WS server without Vite interfering.
    const viteUpgradeListeners = server.listeners('upgrade').slice();
    server.removeAllListeners('upgrade');
    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        // Let Vite handle HMR upgrades
        for (const listener of viteUpgradeListeners) {
          (listener as Function)(request, socket, head);
        }
      }
    });
  } else {
    const { default: path } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    app.use(express.static(path.join(__dirname, '..', 'client')));

    // Production: no Vite, simple upgrade handler
    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
  }

  // Track session subscriptions per client
  const clientSubscriptions = new Map<WebSocket, Set<string>>();
  // Track which session belongs to which project
  const sessionProjectMap = new Map<string, string>();

  wss.on('connection', (ws) => {
    console.log('[ws] client connected');
    clientSubscriptions.set(ws, new Set());

    ws.on('message', async (data) => {
      try {
        const msg: ClientMessage = JSON.parse(data.toString());
        console.log('[ws] received:', msg.type);
        await handleClientMessage(ws, msg, store, clientSubscriptions, sessionProjectMap);
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      clientSubscriptions.delete(ws);
    });
  });

  // File watcher for real-time updates
  const watcher = new ProjectWatcher(store);

  watcher.onChange(async (event) => {
    if (event.type === 'session_changed') {
      sessionProjectMap.set(event.sessionId, event.projectId);

      // Send new turns to all clients subscribed to this session
      const newTurns = await store.getNewTurns(event.projectId, event.sessionId);
      if (newTurns.length === 0) return;

      const msg: ServerMessage = {
        type: 'session_append',
        sessionId: event.sessionId,
        turns: newTurns,
      };

      for (const [ws, subs] of clientSubscriptions) {
        if (subs.has(event.sessionId) && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      }
    } else if (event.type === 'index_changed') {
      // Broadcast updated sessions for this project
      const sessions = await store.getSessions(event.projectId);
      const msg: ServerMessage = {
        type: 'sessions',
        projectId: event.projectId,
        sessions,
      };

      for (const [ws] of clientSubscriptions) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      }
    } else if (event.type === 'new_session') {
      // Broadcast updated project info
      const projects = await store.getProjects();
      const project = projects.find((p) => p.id === event.projectId);
      if (project) {
        const msg: ServerMessage = { type: 'project_update', project };
        for (const [ws] of clientSubscriptions) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
          }
        }
      }
    }
  });

  watcher.start();

  server.listen(PORT, () => {
    console.log(`\n  ohclaudy is running at http://localhost:${PORT}\n`);
  });
}

async function handleClientMessage(
  ws: WebSocket,
  msg: ClientMessage,
  store: SessionStore,
  clientSubscriptions: Map<WebSocket, Set<string>>,
  sessionProjectMap: Map<string, string>
): Promise<void> {
  switch (msg.type) {
    case 'get_projects': {
      const projects = await store.getProjects();
      send(ws, { type: 'projects', projects });
      break;
    }
    case 'get_sessions': {
      const sessions = await store.getSessions(msg.projectId);
      send(ws, { type: 'sessions', projectId: msg.projectId, sessions });
      break;
    }
    case 'subscribe_session': {
      const subs = clientSubscriptions.get(ws);
      if (subs) {
        subs.add(msg.sessionId);
      }
      // Store the project mapping
      sessionProjectMap.set(msg.sessionId, msg.projectId);
      break;
    }
    case 'unsubscribe_session': {
      const subs = clientSubscriptions.get(ws);
      if (subs) {
        subs.delete(msg.sessionId);
      }
      break;
    }
  }
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

main().catch(console.error);
