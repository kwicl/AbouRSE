import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * En local, exécute les fonctions serverless de /api (mêmes fichiers que sur Vercel)
 * en adaptant la requête Node vers l'API Web Request/Response.
 */
function vercelApi(): Plugin {
  const handle = (server: ViteDevServer) => async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const name = url.pathname.match(/^\/api\/([a-z0-9-]+)$/)?.[1];
    if (!name) return next();
    try {
      const mod = (await server.ssrLoadModule(`/api/${name}.ts`)) as Record<string, (r: Request) => Promise<Response>>;
      const fn = mod[req.method ?? 'GET'];
      if (!fn) {
        res.statusCode = 405;
        return res.end();
      }
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const response = await fn(new Request(url, { method: req.method, headers: req.headers as HeadersInit, body }));
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e));
    }
  };
  return {
    name: 'vercel-api',
    configureServer: (server) => void server.middlewares.use(handle(server)),
  };
}

export default defineConfig({
  plugins: [react(), vercelApi()],
  // host: true -> accessible depuis un téléphone sur le même Wi-Fi (http://<IP-du-PC>:5180)
  server: { port: 5180, host: true },
  preview: { port: 5180, host: true },
});
