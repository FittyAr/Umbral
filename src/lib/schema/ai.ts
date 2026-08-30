import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// AI (opcional — no se activa hasta que el admin configure provider+apiKey)
//
// Soporta el formato OpenAI-compatible (/v1/chat/completions). Eso cubre:
// - OpenAI (https://api.openai.com/v1)
// - Ollama local (http://localhost:11434/v1) — modelos open source
// - LM Studio local (http://localhost:1234/v1)
// - OpenRouter (https://openrouter.ai/api/v1)
// - Cualquier otro proxy que respete la API de OpenAI
//
// Cuando `enabled` es false, /api/ai devuelve 503 — el admin lo activa
// explícitamente. La apiKey puede ser vacía para providers que no la
// requieren (algunos Ollama).
// ──────────────────────────────────────────────────────────────────────────
export const AISchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['openai-compatible']).default('openai-compatible'),
  baseUrl: z.string().max(200).default('https://api.openai.com/v1'),
  apiKey: z.string().max(500).default(''),
  model: z.string().max(80).default('gpt-4o-mini'),
  // systemPrompt opcional: el admin puede customizar la personalidad del
  // asistente. Si está vacío, usamos uno default en el idioma `language`.
  systemPrompt: z.string().max(2000).default(''),
  // Idioma en que la IA escribe las tarjetas. Default 'es' (castellano
  // rioplatense, el tono que ven los users en la UI). Cambialo si tus
  // servicios/usuarios son en otro idioma.
  language: z.enum(['es', 'en', 'pt', 'fr', 'de', 'it']).default('es'),
});

// ──────────────────────────────────────────────────────────────────────────
// External search (Brave / Tavily) — opcional, off by default
//
// Usado por /api/fetch-card-info cuando el fetch directo a la URL falla o
// no devuelve info útil. Orden de búsqueda: Brave (si key) → Tavily (si
// key) → Wikipedia REST → DuckDuckGo Instant Answer. Las dos últimas no
// requieren key así que andan out-of-the-box.
//
// Para SearXNG self-hosted: el user puede usar el preset "Custom / Otro"
// en el form de externalSearch y apuntar a su instance. No hay un campo
// dedicado porque SearXNG no requiere key.
// ──────────────────────────────────────────────────────────────────────────
export const ExternalSearchSchema = z.object({
  braveApiKey: z.string().max(200).default(''),
  tavilyApiKey: z.string().max(200).default(''),
});

export type AI = z.infer<typeof AISchema>;
export type ExternalSearch = z.infer<typeof ExternalSearchSchema>;
