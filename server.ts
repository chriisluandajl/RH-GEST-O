import express from 'express';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON & Form data
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve static uploads
  const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
  app.use('/data/uploads', express.static(uploadsDir));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount Main REST API
  app.use('/api', apiRoutes);

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const nets = os.networkInterfaces();
    const addresses: string[] = [];
    for (const name of Object.keys(nets)) {
      const netList = nets[name];
      if (netList) {
        for (const net of netList) {
          if (net.family === 'IPv4' && !net.internal) {
            addresses.push(net.address);
          }
        }
      }
    }

    console.log(`\n===============================================================`);
    console.log(`🚀 SISTEMA GESTÃO RH EMPRESARIAL - SERVIDOR LOCAL ONLINE`);
    console.log(`===============================================================`);
    console.log(`📍 Acesso neste PC:`);
    console.log(`   http://localhost:${PORT}`);
    if (addresses.length > 0) {
      console.log(`\n🌐 Acesso em outros computadores/celulares na mesma rede local:`);
      addresses.forEach((addr) => {
        console.log(`   http://${addr}:${PORT}`);
      });
    }
    console.log(`\n💾 Base de Dados Permanente: data/database.json`);
    console.log(`✅ Todos os computadores salvam e sincronizam no mesmo banco de dados!`);
    console.log(`===============================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
