import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /cse -> Bourse de Casablanca (contourne CORS en dev/preview).
// En production, déployer un proxy équivalent (ex. Vercel rewrite / fonction serverless).
const cseProxy = {
  '/cse': {
    target: 'https://www.casablanca-bourse.com',
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/cse/, '/api/proxy/fr/api/bourse'),
    headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.casablanca-bourse.com/' },
  },
};

export default defineConfig({
  plugins: [react()],
  // host: true -> accessible depuis un téléphone sur le même Wi-Fi (http://<IP-du-PC>:5180)
  server: { port: 5180, host: true, proxy: cseProxy },
  preview: { port: 5180, host: true, proxy: cseProxy },
});
