// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const PORT = Number(process.env.PORT ?? 4321);
const HOST = process.env.HOST ?? '0.0.0.0';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  devToolbar: { enabled: false },
  server: {
    port: PORT,
    host: HOST,
    // Vite 5+ blocks any Host header that isn't localhost by default. Without this,
    // accessing the dev server from a LAN IP, a container hostname (e.g. host.docker.internal),
    // or a reverse-proxy hostname returns a 403 with a plain-text "Blocked request" body
    // that the browser shows without any styling. Allow all hosts in dev so the app works
    // however you reach it. CSRF and auth are still enforced by middleware.ts.
    allowedHosts: true,
  },
  // We implement our own CSRF protection in middleware.ts.
  // Astro's built-in checkOrigin is redundant and rejects legitimate multipart uploads
  // when the client sends Host: host:port but Origin: http://host:port differently.
  security: { checkOrigin: false },
  vite: {
    plugins: [tailwindcss()],
    server: {
      ws: { clientPort: PORT },
    },
    ssr: {
      noExternal: ['sortablejs', 'alpinejs'],
    },
  },
});
