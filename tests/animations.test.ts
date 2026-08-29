import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_HOVER_DURATION_MS,
  MAX_STAGGERED_CARDS,
  SCROLL_ARMED_ATTR,
  SCROLL_IN_CLASS,
  computeAnimationCss,
  computeAnimationScript,
  hasAnimations,
  useAnimatedCounters,
  useTypewriter,
} from '../src/lib/animations.ts';
import { ThemeAnimationsSchema, ThemeSchema } from '../src/lib/schema.ts';

const anim = (overrides: Record<string, unknown> = {}) =>
  ThemeAnimationsSchema.parse(overrides);

describe('animations defaults', () => {
  it('todo arranca apagado', () => {
    const a = anim();
    assert.equal(a.cardEntrance, 'none');
    assert.equal(a.categoryEntrance, 'none');
    assert.equal(a.headerEffect, 'none');
    assert.equal(a.titleTypewriter, false);
    assert.equal(a.counters, false);
    assert.equal(a.respectReducedMotion, true);
    // El hover default y su duración son los que la app ya tenía: prender la
    // feature no puede cambiar cómo se sienten las tarjetas.
    assert.equal(a.cardHover, 'default');
    assert.equal(a.hoverDuration, DEFAULT_HOVER_DURATION_MS);
    assert.equal(a.entranceTrigger, 'load');
    assert.equal(a.entranceEasing, 'ease-out');
  });

  it('el tema trae animations sin pedirlo', () => {
    const theme = ThemeSchema.parse({ background: {} });
    assert.equal(theme.animations.cardEntrance, 'none');
  });

  it('sin efectos no se emite CSS', () => {
    assert.equal(hasAnimations(anim()), false);
    assert.equal(computeAnimationCss(anim()), '');
    assert.equal(computeAnimationCss(undefined), '');
  });

  it('typewriter y contadores solo con su flag', () => {
    assert.equal(useTypewriter(ThemeSchema.parse({ background: {} })), false);
    assert.equal(useAnimatedCounters(ThemeSchema.parse({ background: {} })), false);
    assert.equal(useTypewriter({ animations: anim({ titleTypewriter: true }) } as never), true);
    assert.equal(useAnimatedCounters({ animations: anim({ counters: true }) } as never), true);
  });
});

describe('computeAnimationCss', () => {
  it('emite keyframes y regla de tarjeta con la duracion configurada', () => {
    const css = computeAnimationCss(anim({ cardEntrance: 'fade', cardEntranceDuration: 400 }));
    assert.match(css, /@keyframes umbral-enter-fade/);
    assert.match(css, /\.card\{animation:umbral-enter-fade 400ms ease-out both\}/);
    assert.doesNotMatch(css, /umbral-enter-scale/);
  });

  it('envuelve las reglas en el guard de movimiento reducido', () => {
    const css = computeAnimationCss(anim({ cardEntrance: 'scale' }));
    assert.match(css, /@media \(prefers-reduced-motion:no-preference\)\{/);
    // Los keyframes quedan fuera del guard: son inertes sin una regla que los use.
    assert.ok(css.indexOf('@keyframes') < css.indexOf('@media'));
  });

  it('respectReducedMotion en false saca el guard', () => {
    const css = computeAnimationCss(anim({ cardEntrance: 'fade', respectReducedMotion: false }));
    assert.doesNotMatch(css, /prefers-reduced-motion/);
    assert.match(css, /\.card\{animation/);
  });

  it('sin stagger no hay delays', () => {
    const css = computeAnimationCss(anim({ cardEntrance: 'fade', cardEntranceStagger: 0 }));
    assert.doesNotMatch(css, /animation-delay/);
  });

  it('el stagger se corta para que la ultima tarjeta no quede fuera de pantalla', () => {
    const css = computeAnimationCss(anim({ cardEntrance: 'fade', cardEntranceStagger: 50 }));
    assert.match(css, /nth-child\(2\)\{animation-delay:50ms\}/);
    assert.match(css, new RegExp(`nth-child\\(${MAX_STAGGERED_CARDS}\\)\\{animation-delay:`));
    assert.doesNotMatch(css, new RegExp(`nth-child\\(${MAX_STAGGERED_CARDS + 1}\\)`));
  });

  it('el header comparte efecto y duracion con las tarjetas', () => {
    const css = computeAnimationCss(anim({ headerEffect: 'scale', cardEntranceDuration: 900 }));
    assert.match(css, /\.header\{animation:umbral-enter-scale 900ms ease-out both\}/);
    assert.doesNotMatch(css, /\.card\{animation/);
  });

  it('un mismo efecto en header y tarjetas emite los keyframes una sola vez', () => {
    const css = computeAnimationCss(anim({ cardEntrance: 'fade', headerEffect: 'fade' }));
    assert.equal(css.match(/@keyframes umbral-enter-fade/g)?.length, 1);
  });

  it('typewriter o contadores solos no emiten reglas de CSS', () => {
    assert.equal(computeAnimationCss(anim({ titleTypewriter: true })), '');
    assert.equal(computeAnimationCss(anim({ counters: true })), '');
  });

  it('la schema clampea valores fuera de rango', () => {
    assert.throws(() => ThemeAnimationsSchema.parse({ cardEntranceDuration: 50 }));
    assert.throws(() => ThemeAnimationsSchema.parse({ cardEntranceStagger: 400 }));
    assert.throws(() => ThemeAnimationsSchema.parse({ cardEntrance: 'slide' }));
    assert.throws(() => ThemeAnimationsSchema.parse({ entranceDistance: 100 }));
    assert.throws(() => ThemeAnimationsSchema.parse({ hoverDuration: 900 }));
    assert.throws(() => ThemeAnimationsSchema.parse({ cardHover: 'wobble' }));
  });
});

describe('efectos, curva y distancia', () => {
  it('los slides usan la distancia configurada via custom property', () => {
    const css = computeAnimationCss(anim({ cardEntrance: 'slide-up', entranceDistance: 40 }));
    assert.match(css, /--umbral-enter-distance:40px/);
    assert.match(css, /translateY\(var\(--umbral-enter-distance\)\)/);
  });

  it('slide-down y slide-right invierten el signo del mismo valor', () => {
    const down = computeAnimationCss(anim({ cardEntrance: 'slide-down' }));
    assert.match(down, /translateY\(calc\(-1 \* var\(--umbral-enter-distance\)\)\)/);
    const right = computeAnimationCss(anim({ cardEntrance: 'slide-right' }));
    assert.match(right, /translateX\(calc\(-1 \* var\(--umbral-enter-distance\)\)\)/);
  });

  it('la curva spring se traduce a un cubic-bezier que se pasa de 1', () => {
    const css = computeAnimationCss(anim({ cardEntrance: 'fade', entranceEasing: 'spring' }));
    assert.match(css, /cubic-bezier\(\.34,1\.56,\.64,1\)/);
  });

  it('las curvas simples pasan tal cual', () => {
    const css = computeAnimationCss(anim({ cardEntrance: 'fade', entranceEasing: 'linear' }));
    assert.match(css, /600ms linear both/);
  });

  it('la entrada de categorias se escalona en los dos layouts de grupos', () => {
    const css = computeAnimationCss(anim({ categoryEntrance: 'fade', cardEntranceStagger: 40 }));
    assert.match(css, /\.category-section\{/);
    assert.match(css, /\.groups-vertical>\.category-section:nth-child\(2\)\{animation-delay:40ms\}/);
    assert.match(css, /\.groups-horizontal>\.category-section:nth-child\(2\)\{animation-delay:40ms\}/);
  });
});

describe('disparo por scroll', () => {
  const scrolled = anim({ cardEntrance: 'fade', entranceTrigger: 'scroll' });

  it('la animacion cuelga de la clase que agrega el observer', () => {
    const css = computeAnimationCss(scrolled);
    assert.match(css, new RegExp(`\\.card\\.${SCROLL_IN_CLASS}\\{`));
  });

  it('el estado invisible cuelga del atributo que solo pone el script', () => {
    const css = computeAnimationCss(scrolled);
    assert.match(css, new RegExp(`html\\[${SCROLL_ARMED_ATTR}\\] \\.card\\{opacity:0\\}`));
    // Sin ese atributo no hay ninguna regla que esconda una tarjeta: si el
    // script no corre, el portal se ve completo.
    assert.doesNotMatch(css, /(^|[};])\.card\{opacity:0\}/);
  });

  it('el stagger apunta al selector con la clase', () => {
    const css = computeAnimationCss(anim({ ...scrolled, cardEntranceStagger: 50 }));
    assert.match(css, new RegExp(`\\.grid>\\.card\\.${SCROLL_IN_CLASS}:nth-child\\(2\\)`));
  });

  it('el header ignora el scroll porque esta arriba de todo', () => {
    const css = computeAnimationCss(anim({ headerEffect: 'fade', entranceTrigger: 'scroll' }));
    assert.match(css, /\.header\{animation:/);
    assert.doesNotMatch(css, new RegExp(`\\.header\\.${SCROLL_IN_CLASS}`));
  });

  it('el script solo se emite con trigger scroll y algo que animar', () => {
    assert.equal(computeAnimationScript(anim({ cardEntrance: 'fade' })), '');
    assert.equal(computeAnimationScript(anim({ entranceTrigger: 'scroll' })), '');
    assert.equal(computeAnimationScript(anim({ headerEffect: 'fade', entranceTrigger: 'scroll' })), '');
    assert.notEqual(computeAnimationScript(scrolled), '');
  });

  it('el script chequea movimiento reducido segun la config', () => {
    assert.match(computeAnimationScript(scrolled), /prefers-reduced-motion/);
    const forced = computeAnimationScript(anim({ ...scrolled, respectReducedMotion: false }));
    assert.match(forced, /var R=false/);
  });

  it('el script observa tarjetas y categorias segun lo configurado', () => {
    assert.match(computeAnimationScript(scrolled), /"\.card"/);
    const both = computeAnimationScript(anim({ ...scrolled, categoryEntrance: 'fade' }));
    assert.match(both, /"\.card,\.category-section"/);
  });
});

describe('hover', () => {
  it('el hover default no emite ni una regla', () => {
    assert.equal(computeAnimationCss(anim()), '');
    assert.equal(hasAnimations(anim({ cardHover: 'lift' })), true);
  });

  it('apagar el hover queda fuera del guard de movimiento reducido', () => {
    const css = computeAnimationCss(anim({ cardHover: 'none' }));
    assert.match(css, /\.card:hover\{transform:none\}/);
    assert.doesNotMatch(css, /prefers-reduced-motion/);
  });

  it('los hovers con movimiento van dentro del guard', () => {
    const css = computeAnimationCss(anim({ cardHover: 'grow' }));
    assert.match(css, /@media \(prefers-reduced-motion:no-preference\)\{\.card:hover\{transform:scale\(1\.03\)\}\}/);
  });

  it('la duracion solo se emite si difiere de la que ya tenia la app', () => {
    assert.equal(computeAnimationCss(anim({ hoverDuration: DEFAULT_HOVER_DURATION_MS })), '');
    const css = computeAnimationCss(anim({ cardHover: 'lift', hoverDuration: 400 }));
    assert.match(css, /\.card\{transition-duration:400ms\}/);
  });
});
