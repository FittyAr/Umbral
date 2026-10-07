/**
 * Boot del cliente, compartido por la portada y el panel.
 *
 * Lee los datos que el layout deja en <script type="application/json"
 * id="umbral-boot"> (ver buildBootData en src/lib/client-config.ts) y los
 * expone en `window`. Es un script clásico y externo a propósito: corre
 * sincrónico, antes que `demo-runtime.js` y que los módulos de la página, y
 * no necesita 'unsafe-inline' en la CSP.
 */
(function () {
  var el = document.getElementById('umbral-boot');
  var data = {};
  try {
    data = JSON.parse((el && el.textContent) || '{}') || {};
  } catch (e) {
    data = {};
  }
  window.__BASE_URL__ = typeof data.base === 'string' ? data.base : '/';
  window.__UMBRAL_DEMO__ = data.demo === true;
  if (data.portal) window.__UMBRAL_PORTAL__ = data.portal;
  if (data.demoConfig) window.__INITIAL_DEMO_CONFIG__ = data.demoConfig;
})();
