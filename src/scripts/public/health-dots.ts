import { apiUrl } from './base-url.ts';

/**
 * Puntos de salud en vivo y sparklines de métricas de las páginas públicas.
 *
 * Estaba inline en `index.astro` y copiado en `[category].astro`, y las copias
 * habían divergido: la de la subpágina tenía los textos hardcodeados en
 * español, así que ahí el i18n no se aplicaba. Ahora las etiquetas vienen del
 * markup (`data-health-*`), que es lo único que cambia entre páginas.
 *
 * El ping lo hace el server (`POST /api/status`): así la CSP no tiene que
 * habilitar dominios arbitrarios y sigue valiendo la protección SSRF del
 * endpoint.
 */
interface HealthLabels {
  checking: string;
  ok: string;
  bad: string;
  fetchError: string;
}

const DEFAULTS: HealthLabels = {
  checking: 'Verificando…',
  ok: 'Servicio OK ({latency}ms)',
  bad: 'HTTP {status}',
  fetchError: 'Error al consultar /api/status',
};

function readOptions(): { labels: HealthLabels; intervalSec: number; metrics: boolean } {
  const el = document.querySelector<HTMLElement>('[data-health-config]');
  const d = el?.dataset ?? {};
  return {
    labels: {
      checking: d.healthChecking || DEFAULTS.checking,
      ok: d.healthOk || DEFAULTS.ok,
      bad: d.healthBad || DEFAULTS.bad,
      fetchError: d.healthFetchError || DEFAULTS.fetchError,
    },
    intervalSec: Number(d.healthInterval) || 60,
    metrics: d.healthMetrics === 'true',
  };
}

export function initHealthDots(): void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.card[data-health-check="true"]'));
  if (cards.length === 0) return;

  const { labels, intervalSec, metrics } = readOptions();
  const dots = new Map<string, HTMLElement>();

  for (const c of cards) {
    const id = c.getAttribute('data-card-id');
    if (!id) continue;
    const dot = document.createElement('span');
    dot.className = 'health-dot pending';
    dot.title = labels.checking;
    c.appendChild(dot);
    dots.set(id, dot);
  }
  if (dots.size === 0) return;

  const setDot = (id: string, state: string, title: string) => {
    const dot = dots.get(id);
    if (!dot) return;
    dot.classList.remove('ok', 'bad', 'pending');
    dot.classList.add(state);
    dot.title = title;
  };

  const tick = async () => {
    dots.forEach((dot) => {
      dot.classList.remove('ok', 'bad');
      dot.classList.add('pending');
      dot.title = labels.checking;
    });
    try {
      const res = await fetch(apiUrl('api/status'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(dots.keys()) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      for (const r of (data.results || [])) {
        const okLabel = labels.ok.replace('{latency}', String(r.latencyMs ?? '?'));
        const badLabel = labels.bad.replace('{status}', String(r.status ?? '?'));
        setDot(r.id, r.ok ? 'ok' : 'bad', r.ok ? okLabel : (r.error || badLabel));
      }
    } catch {
      // Mejor rojo que un falso verde que oculte un problema real del server.
      for (const id of dots.keys()) setDot(id, 'bad', labels.fetchError);
    }
  };

  const period = Math.max(10, intervalSec) * 1000;
  void tick();
  setInterval(tick, period);

  if (metrics) initSparklines(cards, Math.max(30, intervalSec) * 1000);
}

function initSparklines(cards: HTMLElement[], period: number): void {
  const load = async () => {
    for (const c of cards) {
      const id = c.getAttribute('data-card-id');
      if (!id) continue;
      try {
        const url = apiUrl(`api/metrics?id=${encodeURIComponent(id)}&svg=1&range=1h&limit=40`);
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) continue;
        const svg = await res.text();
        if (!svg) continue;
        let slot = c.querySelector('.health-sparkline');
        if (!slot) {
          slot = document.createElement('span');
          slot.className = 'health-sparkline';
          c.appendChild(slot);
        }
        slot.innerHTML = svg;
      } catch { /* la feature puede estar apagada: el endpoint da 404 */ }
    }
  };
  void load();
  setInterval(load, period);
}
