import type { APIRoute } from 'astro';
import { AI_PROVIDERS, DEFAULT_AI_SYSTEM_PROMPT } from '~/pages/admin/ai-providers';
import { AI_LANGUAGES, DEFAULT_AI_SYSTEM_PROMPTS } from '~/lib/ai-prompts';

/**
 * GET /api/ai-meta.json — providers, idiomas y prompts default del asistente.
 *
 * Sólo lo necesita el tab IA, que además es opt-in, así que se carga cuando
 * el admin lo abre en vez de viajar en cada carga del dashboard.
 *
 * Prerenderizado: son constantes del build (no hay nada de la config acá,
 * la apiKey del usuario vive en `cfg.ai`).
 */
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      providers: AI_PROVIDERS,
      languages: AI_LANGUAGES,
      defaultSystemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
      defaultSystemPrompts: DEFAULT_AI_SYSTEM_PROMPTS,
    }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    },
  );
