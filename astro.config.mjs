// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// BASE default: raíz. La página demo de GitHub Pages se sirve en
// https://umbral.fitty.ar/ (sin subpath). Si en algún momento se
// vuelve a un subpath (ej: /umbral/), exportá ASTRO_BASE=/umbral/ antes
// de hacer el build. La URL canónica para el visitante es raíz.
const BASE = process.env.ASTRO_BASE || '/';

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
