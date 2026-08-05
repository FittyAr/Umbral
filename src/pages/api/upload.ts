import type { APIRoute } from 'astro';
import { processAndStore, UploadError, type AssetKind } from '~/lib/upload';
import { audit } from '~/lib/config';
import { json, error } from '~/lib/http';

export const prerender = false;

const ALLOWED_KINDS: AssetKind[] = ['logo', 'favicon', 'icon', 'background'];

export const POST: APIRoute = async ({ request }) => {
  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('multipart/form-data')) {
    return error('Se espera multipart/form-data', 400);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error('No se pudo parsear el formulario', 400);
  }

  const file = form.get('file');
  const kindRaw = form.get('kind');
  if (!(file instanceof File)) return error('Falta el archivo', 400);
  const kind = String(kindRaw || 'icon') as AssetKind;
  if (!ALLOWED_KINDS.includes(kind)) {
    return error(`Kind inválido. Permitidos: ${ALLOWED_KINDS.join(', ')}`, 400);
  }

  try {
    const result = await processAndStore(file, kind);
    await audit('upload', `${kind}: ${result.storedName} (${result.bytes}B)`);
    return json(result);
  } catch (err) {
    if (err instanceof UploadError) return error(err.message, err.status);
    console.error('[upload] unexpected error', err);
    return error('Error inesperado al procesar el archivo', 500);
  }
};
