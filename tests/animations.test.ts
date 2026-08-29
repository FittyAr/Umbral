import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_STAGGERED_CARDS,
  computeAnimationCss,
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
    assert.equal(a.headerEffect, 'none');
    assert.equal(a.titleTypewriter, false);
    assert.equal(a.counters, false);
    assert.equal(a.respectReducedMotion, true);
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
  });
});
