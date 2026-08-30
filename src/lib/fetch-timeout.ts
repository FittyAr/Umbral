/**
 * `fetch` con timeout duro.
 *
 * En el repo convivían dos idiomas: `AbortSignal.timeout(ms)` y el trío
 * manual AbortController + setTimeout + clearTimeout. El manual es el que
 * hace falta cuando además querés un `finally` propio, pero es también el
 * que se copia mal (olvidarse el `clearTimeout` deja un timer colgado por
 * request, y con el health check eso son N timers por chequeo).
 *
 * Ojo con el alcance: el timer se cancela cuando `fetch` resuelve, es decir
 * cubre la conexión y los headers, **no** la lectura del body. Los endpoints
 * que necesitan abortar una descarga larga (upload-from-url, fetch-card-info)
 * siguen manejando el controller a mano a propósito, porque ahí el signal
 * tiene que seguir vivo mientras se consume el stream.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
