import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/apiRouter';
import { resolveDatabaseUrl } from './src/server/db/prisma';

// Ensure DATABASE_URL is set with an absolute path and database directory exists
resolveDatabaseUrl();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI flags if provided (e.g. --host 0.0.0.0 --port 3000)
const args = process.argv.slice(2);
const portArgIndex = args.indexOf('--port');
const portFromArgs = portArgIndex !== -1 && args[portArgIndex + 1] ? Number(args[portArgIndex + 1]) : undefined;
const hostArgIndex = args.indexOf('--host');
const hostFromArgs = hostArgIndex !== -1 && args[hostArgIndex + 1] ? args[hostArgIndex + 1] : undefined;

const PORT = Number(process.env.PORT) || portFromArgs || 3000;
const HOST = process.env.HOST || hostFromArgs || '0.0.0.0';

async function startServer() {
  const app = express();

  app.use(express.json());

  // Cloud Run / Kubernetes Health Check Endpoint
  app.get('/healthz', (_req, res) => {
    res.status(200).send('OK');
  });

  // Mount backend API router
  app.use('/api', apiRouter);

  // In development, mount Vite dev server middlewares
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static assets in production
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.get('*', (_req, res) => {
        res.status(503).send('Application is building. Please refresh in a moment.');
      });
    }
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`KPIMS Server successfully started and listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

startServer();
