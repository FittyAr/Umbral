import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

import Dashboard from '../src/pages/admin/dashboard.astro';

/**
 * El dashboard llegó a serializar 420 KB de JSON inline por carga: los 8.586
 * nombres de íconos, el catálogo de ayuda ya renderizado a HTML, los 225
 * presets de apps, los presets de tema (duplicados) y la metadata de IA. Todo
 * eso ahora se pide a demanda, y este test es el que evita que vuelva: falla
 * si el HTML crece de más o si alguna de las claves diferidas reaparece.
 */
// Hoy son 185 KB (eran 420 KB sólo de JSON inline). El margen es para que un
// panel nuevo no haga fallar el test, pero no para que vuelva un catálogo.
const MAX_HTML_BYTES = 230 * 1024;

// Símbolos que no deben volver al payload inline. Son los nombres con los que
// el cliente los leía cuando viajaban en el `define:vars`.
const DEFERRED_GLOBALS = [
  'window.__helpTexts',
  'window.__appPresets',
  'window.__predefinedIconPacks',
  'window.__aiProviders',
  'window.__aiLanguages',
  'window.__defaultAiSystemPrompts',
  'window.__defaultAiSystemPrompt =',
];

let html: string;

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Dashboard, {
    request: new Request('http://localhost/admin/dashboard'),
    locals: { auth: { isAuthenticated: true, csrfToken: 'test-csrf' } },
  });
});

describe('payload inline del dashboard', () => {
  it('renderiza el dashboard autenticado', () => {
    expect(html).toContain('adminApp');
  });

  it('no supera el umbral de tamaño', () => {
    const bytes = Buffer.byteLength(html, 'utf8');
    expect(bytes, `el HTML del dashboard son ${Math.round(bytes / 1024)} KB`).toBeLessThan(
      MAX_HTML_BYTES,
    );
  });

  it('no reintroduce los datos diferidos', () => {
    for (const symbol of DEFERRED_GLOBALS) {
      expect(html, `${symbol} volvió al payload inline`).not.toContain(symbol);
    }
  });

  it('no serializa el catalogo de iconos', () => {
    // Con los 8.586 nombres inline, un pack cualquiera aparecía miles de
    // veces. Un puñado de referencias sueltas (la card de sistema, un
    // preset) es esperable.
    const references = html.match(/lucide\//g)?.length ?? 0;
    expect(references, `${references} referencias a iconos en el HTML`).toBeLessThan(50);
  });

  it('no serializa el hash del super-admin ni el CSRF de la config', () => {
    // `auth.users[]` sí viaja (el panel de usuarios lo edita y lo devuelve),
    // así que esto asume que la config de test no tiene usuarios cargados.
    expect(html).not.toContain('passwordHash');
    expect(html).not.toContain('"csrfToken"');
  });
});
