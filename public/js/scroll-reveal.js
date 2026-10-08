/**
 * Disparo por scroll de las animaciones de entrada (features.animations con
 * `entranceTrigger: 'scroll'`).
 *
 * La configuración llega en los atributos data-* de este mismo <script>
 * (ver computeScrollRevealConfig en src/lib/animations.ts):
 *   data-selector         elementos a observar
 *   data-reduced-motion   "respect" para no armar nada con movimiento reducido
 *
 * Script clásico y sincrónico: corre al final del <body>, antes del primer
 * paint, igual que el script inline que reemplaza. 'data-anim-armed' e
 * 'is-anim-in' tienen que coincidir con SCROLL_ARMED_ATTR y SCROLL_IN_CLASS.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var selector = script.getAttribute('data-selector');
  if (!selector) return;
  var respect = script.getAttribute('data-reduced-motion') === 'respect';
  if (respect && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll(selector);
  if (!els.length) return;
  document.documentElement.setAttribute('data-anim-armed', '');
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-anim-in');
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  els.forEach(function (el) {
    io.observe(el);
  });
})();
