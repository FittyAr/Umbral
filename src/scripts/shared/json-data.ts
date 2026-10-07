/**
 * Lee un bloque `<script type="application/json" id="...">` que dejó el
 * componente JsonData.astro. Devuelve `fallback` si no existe o no parsea.
 */
export function readJsonData<T>(id: string, fallback: T): T {
  const el = document.getElementById(id);
  if (!el?.textContent) return fallback;
  try {
    return JSON.parse(el.textContent) as T;
  } catch {
    return fallback;
  }
}
