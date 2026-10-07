import { describe, it, expect } from 'vitest';
import { uninstallIconPack } from '~/lib/icon-packs/install';
import { sanitizeSvgMarkup } from '~/lib/svg-sanitize';
import { sanitizeHtml } from '~/lib/markdown';

describe('desinstalación de packs', () => {
  it('rechaza ids que salen de la carpeta de packs', async () => {
    for (const id of ['..', '../..', '/', 'a/../../b', '.', '', 'X']) {
      await expect(uninstallIconPack(id), id).rejects.toThrow();
    }
  });

  it('rechaza packs que no están instalados ni en el catálogo', async () => {
    await expect(uninstallIconPack('no-existe-este-pack')).rejects.toThrow(/no está instalado/);
  });
});

describe('sanitizado de SVG', () => {
  it('saca scripts, handlers, foreignObject y referencias externas', () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script>' +
      '<foreignObject><div>x</div></foreignObject>' +
      '<a href="javascript:alert(3)"><circle r="2"/></a>' +
      '<use href="https://evil.example/x.svg#a"/><use href="#ok"/></svg>';
    const clean = sanitizeSvgMarkup(dirty);
    expect(clean).toContain('<svg');
    expect(clean).not.toMatch(/script|onload|foreignObject|javascript:|evil\.example/i);
    expect(clean).toContain('href="#ok"');
  });

  it('devuelve vacío si no queda un svg', () => {
    expect(sanitizeSvgMarkup('<script>alert(1)</script>')).toBe('');
  });
});

describe('markdown en tarjetas', () => {
  it('noLinks desarma los <a> y conserva el texto', () => {
    const html = sanitizeHtml('<p>ver <a href="https://x.test">docs</a></p>', { noLinks: true });
    expect(html).not.toContain('<a');
    expect(html).toContain('docs');
  });
});
