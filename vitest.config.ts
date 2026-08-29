/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

/**
 * Sólo para los tests que renderizan componentes `.astro` con la Container API
 * (`tests/*.astro.test.ts`), que necesitan el pipeline de Vite de Astro para
 * compilarlos. El resto de la suite sigue corriendo con `node --test`.
 */
export default getViteConfig({
  test: {
    include: ['tests/**/*.astro.test.ts'],
    environment: 'node',
  },
});
