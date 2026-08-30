/**
 * Etiquetas de los puntos de salud, resueltas en el server y pasadas al
 * cliente por atributos `data-*` (ver scripts/public/health-dots.ts).
 *
 * Vivían inline en el `define:vars` de la portada, y la subpágina no las
 * tenía: ahí los textos estaban hardcodeados en español, así que el i18n no
 * se aplicaba. Con un solo origen eso no puede volver a pasar.
 *
 * `{latency}` y `{status}` quedan como placeholders para que el cliente los
 * reemplace con el valor de cada chequeo.
 */
export interface HealthLabels {
  checking: string;
  ok: string;
  bad: string;
  fetchError: string;
}

export function buildHealthLabels(
  useI18n: boolean,
  trf: (key: string, vars?: Record<string, string | number>) => string,
): HealthLabels {
  if (!useI18n) {
    return {
      checking: 'Verificando…',
      ok: 'Servicio OK ({latency}ms)',
      bad: 'HTTP {status}',
      fetchError: 'Error al consultar /api/status',
    };
  }
  return {
    checking: trf('home.health.checking'),
    ok: trf('home.health.ok', { latency: '{latency}' }),
    bad: trf('home.health.bad', { status: '{status}' }),
    fetchError: trf('home.health.fetchError'),
  };
}
