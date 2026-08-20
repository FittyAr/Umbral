// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const BASE = process.env.ASTRO_BASE || '/Umbral/';

// https://astro.build/config
export default defineConfig({
  site: 'https://fitty.ar',
  base: BASE,
  output: 'static',
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['sortablejs', 'alpinejs'],
    },
  },
});
