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
  server: { port: PORT, host: HOST },
  // We implement our own CSRF protection in middleware.ts.
  // Astro's built-in checkOrigin is redundant and rejects legitimate multipart uploads
  // when the client sends Host: host:port but Origin: http://host:port differently.
  security: { checkOrigin: false },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['sortablejs', 'alpinejs'],
    },
  },
});
