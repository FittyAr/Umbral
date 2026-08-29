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
 * título (TypewriterText) y los contadores (CountUp), que son nodos de texto.
 */

/** Efectos disponibles, compartidos por tarjetas, categorías y header. */
export type AnimationEffect = ThemeAnimations['cardEntrance'];

/**
 * Cuántos elementos reciben retardo escalonado. Más allá de esto el retardo
 * acumulado sería tan largo que el último aparecería mucho después de que el
 * usuario ya scrolleó, así que se corta y el resto entra junto.
 */
export const MAX_STAGGERED_CARDS = 12;

/** Clase que agrega el observer cuando el elemento entra en pantalla. */
export const SCROLL_IN_CLASS = 'is-anim-in';

/**
 * Atributo en `<html>` que sólo pone el script del observer. El CSS que
 * esconde los elementos antes de animarlos cuelga de él, así que sin
 * JavaScript nada se esconde: el portal se ve completo.
 */
export const SCROLL_ARMED_ATTR = 'data-anim-armed';

/**
 * A qué elementos apunta el CSS generado.
 *
 * Existe para que la vista previa del admin use exactamente el mismo
 * generador que la portada, apuntando a su propio markup en miniatura, en vez
 * de mantener una segunda implementación que se desincroniza.
 */
export interface AnimationTargets {
  /** Prefijo de todos los selectores. La portada no necesita ninguno. */
  scope: string;
  card: string;
  /** Contenedor de las tarjetas, para los `nth-child` del escalonado. */
  cardParent: string;
  /** `null` en markups que no tienen bloques de categoría. */
  category: string | null;
  categoryParents: string[];
  header: string;
  /**
   * Sufijo de los nombres de los `@keyframes`. La miniatura del admin lo usa
   * con un número que cambia en cada edición: renombrar la animación es lo
   * que hace que el navegador la vuelva a reproducir, que es justamente lo
   * que el admin necesita ver al mover un control.
   */
  nameSuffix?: string;
}

export const PUBLIC_TARGETS: AnimationTargets = {
  scope: '',
  card: '.card',
  cardParent: '.grid',
  category: '.category-section',
  categoryParents: ['.groups-vertical', '.groups-horizontal'],
  header: '.header',
};

/**
 * La miniatura del admin no tiene bloques de categoría, así que la entrada de
 * categorías no se puede mostrar ahí. El resto de los efectos sí.
 */
export const PREVIEW_TARGETS: AnimationTargets = {
  scope: '.theme-preview-frame ',
  card: '.theme-preview-card',
  cardParent: '.theme-preview-cards',
  category: null,
  categoryParents: [],
  header: '.theme-preview-header',
};

/**
 * La distancia de los desplazamientos entra por custom property para que un
 * mismo `@keyframes` sirva para cualquier valor configurado, en vez de emitir
 * una regla distinta por cada distancia.
 */
const DISTANCE_VAR = '--umbral-enter-distance';

const KEYFRAME_BODIES: Record<Exclude<AnimationEffect, 'none'>, string> = {
  fade: '{from{opacity:0}to{opacity:1}}',
  scale: '{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}',
  'slide-up': `{from{opacity:0;transform:translateY(var(${DISTANCE_VAR}))}to{opacity:1;transform:none}}`,
  'slide-down': `{from{opacity:0;transform:translateY(calc(-1 * var(${DISTANCE_VAR})))}to{opacity:1;transform:none}}`,
  'slide-left': `{from{opacity:0;transform:translateX(var(${DISTANCE_VAR}))}to{opacity:1;transform:none}}`,
  'slide-right': `{from{opacity:0;transform:translateX(calc(-1 * var(${DISTANCE_VAR})))}to{opacity:1;transform:none}}`,
  blur: '{from{opacity:0;filter:blur(8px)}to{opacity:1;filter:none}}',
};

/**
 * `spring` se pasa de 1 y vuelve, por eso el cubic-bezier con el segundo
 * control arriba de 1. No se puede usar en `blur` sin que el filtro
 * parpadee, pero como sólo afecta opacidad y transform, no molesta.
 */
const EASINGS: Record<ThemeAnimations['entranceEasing'], string> = {
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  linear: 'linear',
  spring: 'cubic-bezier(.34,1.56,.64,1)',
};

/** Reglas de `:hover` por opción. `default` no emite nada: es el CSS base. */
const HOVER_RULES: Record<Exclude<ThemeAnimations['cardHover'], 'default' | 'none'>, string> = {
  lift: 'transform:translateY(-6px)',
  grow: 'transform:scale(1.03)',
  glow: 'transform:translateY(-2px);box-shadow:0 0 0 1px var(--accent),0 8px 30px color-mix(in srgb,var(--accent) 35%,transparent)',
  tilt: 'transform:translateY(-4px) rotate(-1deg)',
};

/** true si hay al menos un efecto encendido y vale la pena emitir CSS. */
export function hasAnimations(animations: ThemeAnimations | undefined): boolean {
  if (!animations) return false;
  return (
    animations.cardEntrance !== 'none' ||
    animations.categoryEntrance !== 'none' ||
    animations.headerEffect !== 'none' ||
    animations.cardHover !== 'default' ||
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

/** Duración de la transición de hover que ya tiene `.card` en global.css. */
export const DEFAULT_HOVER_DURATION_MS = 180;

/**
 * La distancia sólo tiene sentido en los slides. Para el resto no se emite,
 * así el CSS de un `fade` queda tan corto como antes de que existiera la
 * opción.
 */
function distanceFor(effect: Exclude<AnimationEffect, 'none'>, distance: number): string {
  return effect.startsWith('slide-') ? `${DISTANCE_VAR}:${distance}px;` : '';
}

/** Retardos escalonados para los hijos de un contenedor. */
function staggerRules(parent: string, child: string, stagger: number): string[] {
  if (stagger <= 0) return [];
  const rules: string[] = [];
  for (let index = 1; index < MAX_STAGGERED_CARDS; index++) {
    rules.push(`${parent}>${child}:nth-child(${index + 1}){animation-delay:${index * stagger}ms}`);
  }
  return rules;
}

/**
 * Reglas de entrada de tarjetas, categorías y header, más el hover.
 *
 * `animation-fill-mode` queda en `both` para que el elemento arranque
 * transparente, pero sólo dentro del guard: si el navegador ignora la
 * animación, se ve normal en vez de quedar invisible.
 */
export function computeAnimationCss(
  animations: ThemeAnimations | undefined,
  targets: AnimationTargets = PUBLIC_TARGETS,
): string {
  if (!animations || !hasAnimations(animations)) return '';

  const {
    cardEntrance,
    cardEntranceDuration,
    cardEntranceStagger,
    categoryEntrance,
    headerEffect,
    entranceDistance,
    entranceEasing,
    entranceTrigger,
    cardHover,
    hoverDuration,
    respectReducedMotion,
  } = animations;

  const easing = EASINGS[entranceEasing];
  const onScroll = entranceTrigger === 'scroll';
  const keyframes = new Set<string>();
  const rules: string[] = [];
  const unguarded: string[] = [];

  /**
   * Con disparo por scroll la animación cuelga de una clase que sólo agrega
   * el observer, y el estado inicial invisible cuelga del atributo que sólo
   * pone el script. Sin JavaScript no se cumple ninguna de las dos, así que
   * el contenido queda visible y quieto.
   */
  const suffix = targets.nameSuffix ?? '';
  const animationName = (effect: Exclude<AnimationEffect, 'none'>) => `umbral-enter-${effect}${suffix}`;

  /** Devuelve el selector del hijo sin scope, para los `nth-child`. */
  const animate = (selector: string, effect: Exclude<AnimationEffect, 'none'>) => {
    keyframes.add(`@keyframes ${animationName(effect)}${KEYFRAME_BODIES[effect]}`);
    const child = onScroll ? `${selector}.${SCROLL_IN_CLASS}` : selector;
    if (onScroll) {
      rules.push(`html[${SCROLL_ARMED_ATTR}] ${targets.scope}${selector}{opacity:0}`);
    }
    rules.push(
      `${targets.scope}${child}{${distanceFor(effect, entranceDistance)}animation:${animationName(effect)} ${cardEntranceDuration}ms ${easing} both}`,
    );
    return child;
  };

  if (cardEntrance !== 'none') {
    const child = animate(targets.card, cardEntrance);
    rules.push(...staggerRules(`${targets.scope}${targets.cardParent}`, child, cardEntranceStagger));
  }

  if (targets.category && categoryEntrance !== 'none') {
    const child = animate(targets.category, categoryEntrance);
    for (const parent of targets.categoryParents) {
      rules.push(...staggerRules(`${targets.scope}${parent}`, child, cardEntranceStagger));
    }
  }

  // El header está siempre arriba de todo, así que animarlo por scroll no
  // tendría sentido: entra al cargar aunque el resto espere al viewport.
  if (headerEffect !== 'none') {
    keyframes.add(`@keyframes ${animationName(headerEffect)}${KEYFRAME_BODIES[headerEffect]}`);
    rules.push(
      `${targets.scope}${targets.header}{${distanceFor(headerEffect, entranceDistance)}animation:${animationName(headerEffect)} ${cardEntranceDuration}ms ${easing} both}`,
    );
  }

  const card = `${targets.scope}${targets.card}`;
  if (cardHover === 'none') {
    // Apagar el hover no es una animación: va fuera del guard para que valga
    // también con movimiento reducido, donde igual no debería haber transform.
    unguarded.push(`${card}:hover{transform:none}`);
  } else if (cardHover !== 'default') {
    rules.push(`${card}:hover{${HOVER_RULES[cardHover]}}`);
  }

  if (hoverDuration !== DEFAULT_HOVER_DURATION_MS) {
    unguarded.push(`${card}{transition-duration:${hoverDuration}ms}`);
  }

  const guardedRules = guarded(rules.join(''), respectReducedMotion);
  if (!guardedRules && !unguarded.length) return '';

  // Los keyframes van fuera del guard: son inertes sin una regla que los use.
  return `${[...keyframes].join('')}${unguarded.join('')}${guardedRules}`;
}

/**
 * Script del disparo por scroll. Devuelve '' salvo que haya un efecto de
 * entrada configurado con `entranceTrigger: 'scroll'`.
 *
 * Es la única pieza de JavaScript de las animaciones de layout: sin ella el
 * portal se ve completo y quieto, nunca vacío.
 */
export function computeAnimationScript(animations: ThemeAnimations | undefined): string {
  if (!animations || animations.entranceTrigger !== 'scroll') return '';

  const selectors: string[] = [];
  if (animations.cardEntrance !== 'none') selectors.push(PUBLIC_TARGETS.card);
  if (animations.categoryEntrance !== 'none' && PUBLIC_TARGETS.category) {
    selectors.push(PUBLIC_TARGETS.category);
  }
  if (!selectors.length) return '';

  const selector = JSON.stringify(selectors.join(','));
  const respect = animations.respectReducedMotion ? 'true' : 'false';

  return `(function(){var R=${respect};if(R&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(!('IntersectionObserver' in window))return;var els=document.querySelectorAll(${selector});if(!els.length)return;document.documentElement.setAttribute('${SCROLL_ARMED_ATTR}','');var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('${SCROLL_IN_CLASS}');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:.05});els.forEach(function(el){io.observe(el);});})();`;
}

/** true si el título del header va con el efecto de máquina de escribir. */
export function useTypewriter(theme: Theme | undefined): boolean {
  return theme?.animations?.titleTypewriter === true;
}

/** true si los contadores de la barra de estado deben animarse. */
export function useAnimatedCounters(theme: Theme | undefined): boolean {
  return theme?.animations?.counters === true;
}
