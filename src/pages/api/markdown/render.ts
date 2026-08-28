import type { APIRoute } from 'astro';
import { json, error } from '~/lib/http';
import { renderMarkdown } from '~/lib/markdown';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.auth?.isAuthenticated) {
    return error('Unauthorized', 401);
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (text.length > 20_000) {
    return error('Text too long', 400);
  }

  const html = await renderMarkdown(text);
  return json({ html });
};
