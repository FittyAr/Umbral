import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

import CountUp from '@astroanimate/core/CountUp';
import ScaleIn from '@astroanimate/core/ScaleIn';
import TypewriterText from '@astroanimate/core/TypewriterText';

import ThemeAnimations from '../src/components/admin/theme/ThemeAnimations.astro';
import ThemePreview from '../src/components/admin/theme/ThemePreview.astro';

const adminProps = { props: { useI18n: false, tr: (key: string) => key } } as never;

/**
 * @astroanimate/core declara `peerDependencies: astro ^4 || ^5 || ^6` y el
 * proyecto está en 7, así que el peer se fuerza con un override en
 * package.json. Estos tests son la contraparte: comprueban que los tres
 * componentes que usa Umbral compilan y renderizan de verdad bajo Astro 7, y
 * que cumplen los dos requisitos duros del proyecto, offline y accesibilidad.
 */
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('@astroanimate/core bajo Astro 7', () => {
  it('ScaleIn renderiza el contenido y lo deja visible sin JS', async () => {
    const html = await container.renderToString(ScaleIn as never, {
      slots: { default: '<span id="probe">Hola</span>' },
    } as never);

    expect(html).toContain('id="probe"');
    expect(html).toContain('data-astro-scale-in');
    // Sin `enhance` no se emite script: la tarjeta se ve igual con JS apagado.
    expect(html).not.toContain('<script');
    expect(html).toContain('data-enhance="false"');
  });

  it('ScaleIn con enhance emite el script inline y respeta reduced motion', async () => {
    const html = await container.renderToString(ScaleIn as never, {
      props: { enhance: true, duration: 400, delay: 60 },
      slots: { default: '<span>Hola</span>' },
    } as never);

    expect(html).toContain('IntersectionObserver');
    expect(html).toContain('prefers-reduced-motion: reduce');
    expect(html).toContain('--duration: 400ms');
    expect(html).toContain('--delay: 60ms');
  });

  it('TypewriterText y CountUp renderizan su texto como fallback', async () => {
    const typewriter = await container.renderToString(TypewriterText as never, {
      props: { texts: ['Portal interno'] },
    } as never);
    const countUp = await container.renderToString(CountUp as never, {
      props: { value: 42 },
    } as never);

    // Sin JS el texto tiene que estar servido, no aparecer letra por letra.
    expect(typewriter).toContain('Portal interno');
    expect(countUp).toContain('42');
  });

  it('ningun componente pide recursos externos', async () => {
    const rendered = await Promise.all([
      container.renderToString(ScaleIn as never, { props: { enhance: true } } as never),
      container.renderToString(TypewriterText as never, {
        props: { texts: ['x'], enhance: true },
      } as never),
      container.renderToString(CountUp as never, { props: { value: 1, enhance: true } } as never),
    ]);

    for (const html of rendered) {
      expect(html).not.toMatch(/https?:\/\//);
    }
  });
});

describe('vista previa del admin', () => {
  it('el style de animaciones queda dentro del frame, no hoisteado al head', async () => {
    const html = await container.renderToString(ThemePreview as never, adminProps);

    // Sin `is:inline` Astro se lo lleva al head, donde el x-text del preview
    // nunca lo alcanzaría y las animaciones no se verían.
    const frame = html.slice(html.indexOf('theme-preview-frame'));
    expect(frame).toContain('<style x-text="themePreviewAnimationCss()">');
  });

  it('la miniatura tiene los elementos a los que apunta el CSS generado', async () => {
    const html = await container.renderToString(ThemePreview as never, adminProps);

    expect(html).toContain('theme-preview-header');
    expect(html).toContain('theme-preview-cards');
    expect(html).toContain('theme-preview-card ');
  });
});

describe('panel de animaciones', () => {
  it('agrupa los controles y no deja ninguno suelto', async () => {
    const html = await container.renderToString(ThemeAnimations as never, adminProps);

    const groups = html.match(/class="anim-group[ "]/g) ?? [];
    expect(groups.length).toBe(4);
    for (const model of [
      'cardEntrance',
      'categoryEntrance',
      'headerEffect',
      'cardEntranceDuration',
      'cardEntranceStagger',
      'entranceEasing',
      'entranceTrigger',
      'entranceDistance',
      'cardHover',
      'hoverDuration',
      'titleTypewriter',
      'counters',
      'respectReducedMotion',
    ]) {
      expect(html).toContain(`cfg.theme.animations.${model}`);
    }
  });

  it('los controles compartidos sólo aparecen cuando hay algo que ajustar', async () => {
    const html = await container.renderToString(ThemeAnimations as never, adminProps);

    expect(html).toContain("cfg.theme.animations.cardEntrance !== 'none'");
    // La distancia es exclusiva de los slides.
    expect(html).toContain("'slide-up','slide-down','slide-left','slide-right'");
  });

  it('ofrece repetir la animación y apagar todo', async () => {
    const html = await container.renderToString(ThemeAnimations as never, adminProps);

    expect(html).toContain('themeAnimationsReplay()');
    expect(html).toContain('themeAnimationsResetAll()');
  });
});
