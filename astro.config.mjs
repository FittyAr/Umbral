// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const PORT = Number(process.env.PORT ?? 4321);
const HOST = process.env.HOST ?? '0.0.0.0';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  server: {
    port: PORT,
    host: HOST,
    allowedHosts: true,
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['sortablejs', 'alpinejs'],
    },
  },
});
