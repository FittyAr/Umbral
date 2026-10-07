/**
 * Efecto máquina de escribir del título (features.animations →
 * titleTypewriter).
 *
 * El markup y el CSS son los de TypewriterText de @astroanimate/core, pero
 * se renderiza con `enhance={false}`: su versión "enhanced" emite un script
 * inline, que la CSP no permite. Esto cubre el único uso de la portada (un
 * texto, sin loop ni borrado) desde un módulo.
 */
export function initTypewriters(): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  document
    .querySelectorAll<HTMLElement>('[data-umbral-typewriter] [data-typewriter]:not([data-ready])')
    .forEach((root) => {
      let texts: string[] = [];
      try {
        texts = JSON.parse(root.dataset.texts ?? '[]');
      } catch {
        return;
      }
      const text = texts.join(' ');
      const display = root.querySelector<HTMLElement>('[data-typewriter-display]');
      if (!text || !display) return;

      const speed = Number(root.dataset.typeSpeed ?? '70');
      // data-ready muestra la parte dinámica y oculta el texto estático.
      root.dataset.ready = 'true';
      display.textContent = '';
      let i = 0;
      const tick = () => {
        i += 1;
        display.textContent = text.slice(0, i);
        if (i < text.length) window.setTimeout(tick, speed);
      };
      window.setTimeout(tick, speed);
    });
}
