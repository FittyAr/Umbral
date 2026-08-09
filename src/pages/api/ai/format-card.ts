import type { APIRoute } from 'astro';
import { json, error } from '~/lib/http';
import { getConfig } from '~/lib/config';
import { getDefaultSystemPrompt } from '~/lib/ai-prompts';

export const prerender = false;

/** POST /api/ai/format-card
 *
 *  Recibe { title, description, url } (estado actual de la card en el form)
 *  y devuelve { title, description } mejorado por la IA configurada.
 *
 *  Pensado para el botón "Mejorar con IA" en el form de tarjeta: el user
 *  tiene un título/descripción a medio escribir, la IA lo pule.
 *
 *  Errores posibles:
 *  - 503: AI no configurado (admin no activó o falta apiKey)
 *  - 502: provider rechazó la request
 *  - 504: timeout
 */
export const POST: APIRoute = async ({ request }) => {
  const cfg = await getConfig();
  const ai = cfg.ai;
  if (!ai?.enabled) {
    return error('IA no está habilitada. Configurala en Admin → IA.', 503);
  }
  if (!ai.baseUrl) {
    return error('Falta baseUrl de la IA', 503);
  }

  let body: { title?: string; description?: string; url?: string; instruction?: string };
  try {
    body = await request.json();
  } catch {
    return error('JSON inválido', 400);
  }
  const { title = '', description = '', url = '', instruction } = body;
  if (!title && !description && !url) {
    return error('Necesito al menos un campo (título, descripción o URL) para mejorar', 400);
  }

  const systemPrompt = ai.systemPrompt || getDefaultSystemPrompt(ai.language || 'es');

  const userPrompt = `Mejorá esta tarjeta de portal interno:
${url ? `URL: ${url}\n` : ''}Título actual: ${title || '(vacío)'}
Descripción actual: ${description || '(vacía)'}
${instruction ? `\nInstrucción adicional del usuario: ${instruction}` : ''}

Devolvé únicamente el JSON con el title y description mejorados.`;

  // Fetch al provider (OpenAI-compatible). Soporta http(s) y localhost.
  // El baseUrl puede ser cualquier endpoint que respete /v1/chat/completions.
  const endpoint = `${ai.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000); // 30s — la IA puede tardar
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(ai.apiKey ? { Authorization: `Bearer ${ai.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        // Pedimos JSON explícito — provider que soporte response_format.
        // Los que no (Ollama viejos, etc.) lo ignoran y devuelven texto
        // que parseamos abajo como fallback.
        ...(ai.provider === 'openai-compatible' ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      return error('Timeout (30s) llamando a la IA', 504);
    }
    return error(`No se pudo contactar la IA: ${(err as Error).message}`, 502);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return error(`IA respondió HTTP ${res.status}: ${errText.slice(0, 200)}`, 502);
  }

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return error('IA no devolvió contenido', 502);
  }

  // Parsear el JSON. A veces la IA lo envuelve en ```json ... ``` a pesar
  // del response_format. Ser tolerantes.
  const parsed = extractJson(content);
  if (!parsed || typeof parsed !== 'object') {
    return error('IA no devolvió JSON parseable', 502);
  }
  const improved = {
    title: String(parsed.title || title).slice(0, 200),
    description: String(parsed.description || description).slice(0, 500),
  };
  return json(improved);
};

/** Extrae el primer JSON object de un string. Acepta ```json ... ``` y
 *  texto antes/después. */
function extractJson(s: string): unknown {
  // 1) Try parse the whole string
  try { return JSON.parse(s); } catch { /* keep trying */ }
  // 2) Find the first { ... } block (greedy, balanced)
  const m = s.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* keep trying */ }
  }
  // 3) Find the first { ... } with balanced braces
  let depth = 0;
  let start = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (s[i] === '}') { depth--; if (depth === 0 && start >= 0) {
      try { return JSON.parse(s.slice(start, i + 1)); } catch { /* keep going */ }
      start = -1;
    }}
  }
  return null;
}
