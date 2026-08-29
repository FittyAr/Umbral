import type { Theme, ThemeAnimations } from './schema';

/**
 * CSS de las animaciones opt-in, generado en el servidor igual que
 * `computeCardSpanCss`.
 *
 * Por qué CSS y no los componentes de @astroanimate/core para las tarjetas:
 * las tarjetas son hijas directas de `.grid` y el ancho se resuelve con
 * `.grid>[data-span="N"]`. Envolverlas en un componente mete un elemento
 * intermedio que se convierte en el hijo del grid y rompe tanto el ancho como
 * las columnas. Con `@keyframes` la animación va sobre la tarjeta misma.
 *
 * Los componentes de la librería sí se usan donde no hay layout en juego: el
 * tagline (TypewriterText) y los contadores (CountUp), que son nodos de texto.
 */

/** Efectos disponibles, compartidos por tarjetas y header. */
export type AnimationEffect = ThemeAnimations['cardEntrance'];

/**
 * Cuántas tarjetas reciben retardo escalonado. Más allá de esto el retardo
 * acumulado sería tan largo que la última tarjeta aparecería mucho después de
 * que el usuario ya scrolleó, así que se corta y el resto entra junto.
 */
export const MAX_STAGGERED_CARDS = 12;

const KEYFRAMES: Record<Exclude<AnimationEffect, 'none'>, string> = {
  fade: '@keyframes umbral-enter-fade{from{opacity:0}to{opacity:1}}',
  scale: '@keyframes umbral-enter-scale{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}',
};

/** true si hay al menos un efecto encendido y vale la pena emitir CSS. */
export function hasAnimations(animations: ThemeAnimations | undefined): boolean {
  if (!animations) return false;
  return (
    animations.cardEntrance !== 'none' ||
    animations.headerEffect !== 'none' ||
    animations.titleTypewriter ||
    animations.counters
  );
}

/**
 * Envuelve las reglas en el guard de movimiento reducido cuando corresponde.
 *
 * El guard va acá y no sólo en el CSS global porque estas reglas se inyectan
 * inline y ganan por especificidad de orden: si no se envuelven, apagar el
 * movimiento en el sistema no alcanzaría.
 */
function guarded(rules: string, respectReducedMotion: boolean): string {
  if (!rules) return '';
  if (!respectReducedMotion) return rules;
  return `@media (prefers-reduced-motion:no-preference){${rules}}`;
}

/**
 * Reglas de entrada de tarjetas y header.
 *
 * `animation-fill-mode` queda en `both` para que la tarjeta arranque
 * transparente, pero sólo dentro del guard: si el navegador ignora la
 * animación, la tarjeta se ve normal en vez de quedar invisible.
 */
export function computeAnimationCss(animations: ThemeAnimations | undefined): string {
  if (!animations || !hasAnimations(animations)) return '';

  const {
    cardEntrance,
    cardEntranceDuration,
    cardEntranceStagger,
    headerEffect,
    respectReducedMotion,
  } = animations;

  const keyframes = new Set<string>();
  const rules: string[] = [];

  if (cardEntrance !== 'none') {
    keyframes.add(KEYFRAMES[cardEntrance]);
    rules.push(
      `.card{animation:umbral-enter-${cardEntrance} ${cardEntranceDuration}ms ease-out both}`,
    );
    if (cardEntranceStagger > 0) {
      for (let index = 1; index < MAX_STAGGERED_CARDS; index++) {
        const delay = index * cardEntranceStagger;
        rules.push(`.grid>.card:nth-child(${index + 1}){animation-delay:${delay}ms}`);
      }
    }
  }

  if (headerEffect !== 'none') {
    keyframes.add(KEYFRAMES[headerEffect]);
    rules.push(
      `.header{animation:umbral-enter-${headerEffect} ${cardEntranceDuration}ms ease-out both}`,
    );
  }

  const guardedRules = guarded(rules.join(''), respectReducedMotion);
  if (!guardedRules) return '';

  // Los keyframes van fuera del guard: son inertes sin una regla que los use.
  return `${[...keyframes].join('')}${guardedRules}`;
}

/** true si el título del header va con el efecto de máquina de escribir. */
export function useTypewriter(theme: Theme | undefined): boolean {
  return theme?.animations?.titleTypewriter === true;
}

/** true si los contadores de la barra de estado deben animarse. */
export function useAnimatedCounters(theme: Theme | undefined): boolean {
  return theme?.animations?.counters === true;
}
