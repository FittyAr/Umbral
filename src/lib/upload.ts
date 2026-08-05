import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import crypto from 'node:crypto';
import { UPLOADS_DIR } from './config';

export type AssetKind = 'logo' | 'favicon' | 'icon' | 'background';

interface AssetLimits {
  maxBytes: number;
  targetWidth?: number;
  processAs: 'image' | 'svg' | 'raw';
  outExt: string;
}

const LIMITS: Record<AssetKind, AssetLimits> = {
  logo: { maxBytes: 1 * 1024 * 1024, targetWidth: 512, processAs: 'image', outExt: 'webp' },
  favicon: { maxBytes: 256 * 1024, targetWidth: 64, processAs: 'image', outExt: 'webp' },
  icon: { maxBytes: 512 * 1024, targetWidth: 128, processAs: 'image', outExt: 'webp' },
  background: { maxBytes: 5 * 1024 * 1024, targetWidth: 1920, processAs: 'image', outExt: 'webp' },
};

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

// DOMPurify singleton (jsdom is heavy; reuse)
const window = new JSDOM('').window;
// @ts-expect-error JSDOM window is structurally compatible
const purify = createDOMPurify(window);

export interface ProcessedAsset {
  /** Stored filename (no path), relative to uploads dir. */
  storedName: string;
  /** Public URL the browser should use. */
  publicUrl: string;
  /** Bytes written. */
  bytes: number;
  /** Detected MIME. */
  mime: string;
  /** Whether the file was sanitized (SVG). */
  sanitized: boolean;
}

export class UploadError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function safeExt(mime: string, processAs: 'image' | 'svg' | 'raw', outExt: string): string {
  if (processAs === 'image') return outExt;
  if (mime === 'image/svg+xml') return 'svg';
  return outExt;
}

function newStoredName(ext: string): string {
  return `${crypto.randomUUID()}.${ext}`;
}

async function sanitizeSvg(input: string): Promise<string> {
  const cleaned = purify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus'],
  });
  return cleaned;
}

export async function processAndStore(
  file: File,
  kind: AssetKind,
): Promise<ProcessedAsset> {
  const limits = LIMITS[kind];
  if (!limits) throw new UploadError(`Tipo de asset inválido: ${kind}`);

  // 1) Size cap (cheap fast-path)
  if (file.size === 0) throw new UploadError('Archivo vacío', 400);
  if (file.size > limits.maxBytes) {
    throw new UploadError(
      `Archivo demasiado grande (${(file.size / 1024).toFixed(0)} KB). Máximo ${(
        limits.maxBytes / 1024
      ).toFixed(0)} KB para ${kind}.`,
      413,
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // 2) MIME sniff from bytes (never trust Content-Type)
  const detected = await fileTypeFromBuffer(buf);
  let mime: string;

  if (kind === 'favicon' || (detected && ALLOWED_MIME.has(detected.mime))) {
    mime = detected?.mime ?? '';
  } else {
    // Fallback: check if SVG by content sniff (no magic number for SVG)
    const head = buf.subarray(0, 512).toString('utf8').trimStart();
    if (head.startsWith('<svg') || head.startsWith('<?xml')) {
      mime = 'image/svg+xml';
    } else {
      throw new UploadError(
        `Tipo de archivo no permitido. Aceptados: PNG, JPEG, WebP, SVG, GIF.`,
        415,
      );
    }
  }

  if (!ALLOWED_MIME.has(mime)) {
    throw new UploadError(`Tipo no permitido: ${mime}`, 415);
  }

  // 3) Process / sanitize
  let outBuffer: Buffer;
  let storedExt: string;
  let sanitized = false;

  if (mime === 'image/svg+xml' || limits.processAs === 'svg') {
    const svgString = buf.toString('utf8');
    const cleaned = await sanitizeSvg(svgString);
    outBuffer = Buffer.from(cleaned, 'utf8');
    storedExt = 'svg';
    sanitized = true;
  } else {
    // Raster → resize / re-encode with sharp
    try {
      let pipeline = sharp(buf, { failOn: 'error' }).rotate(); // auto-rotate EXIF
      if (limits.targetWidth) {
        pipeline = pipeline.resize({
          width: limits.targetWidth,
          withoutEnlargement: true,
        });
      }
      outBuffer = await pipeline
        .webp({ quality: kind === 'background' ? 80 : 90, effort: 4 })
        .toBuffer();
      storedExt = limits.outExt;
    } catch (err) {
      throw new UploadError(
        `No se pudo procesar la imagen: ${(err as Error).message}`,
        400,
      );
    }
  }

  // 4) Write to disk
  const storedName = newStoredName(storedExt);
  const target = path.join(UPLOADS_DIR, storedName);
  // path.resolve guard against path traversal
  const resolved = path.resolve(target);
  const resolvedUploads = path.resolve(UPLOADS_DIR);
  if (!resolved.startsWith(resolvedUploads + path.sep) && resolved !== resolvedUploads) {
    throw new UploadError('Path traversal detectado', 400);
  }
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(resolved, outBuffer);

  return {
    storedName,
    publicUrl: `/api/assets/${storedName}`,
    bytes: outBuffer.length,
    mime: storedExt === 'svg' ? 'image/svg+xml' : `image/${storedExt}`,
    sanitized,
  };
}

/** Read an asset by name for the public endpoint. */
export async function readAsset(name: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return null;
  const full = path.resolve(UPLOADS_DIR, name);
  if (!full.startsWith(path.resolve(UPLOADS_DIR) + path.sep) && full !== path.resolve(UPLOADS_DIR)) {
    return null;
  }
  try {
    const stat = await fs.stat(full);
    if (!stat.isFile()) return null;
    const buf = await fs.readFile(full);
    const ext = path.extname(name).slice(1).toLowerCase();
    const mime =
      ext === 'svg'
        ? 'image/svg+xml'
        : ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'gif'
        ? 'image/gif'
        : 'image/webp';
    return { buffer: buf, mime };
  } catch {
    return null;
  }
}
