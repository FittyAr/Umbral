import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import crypto from 'node:crypto';
import { UPLOADS_DIR, getConfig } from './config';
import type { UploadSecurity } from './schema';

export type AssetKind = 'logo' | 'favicon' | 'icon' | 'background';

interface AssetStatic {
  targetWidth?: number;
  outExt: string;
}

/** Static structural limits (resizing, output format). Size limits come from config. */
const STATIC: Record<AssetKind, AssetStatic> = {
  logo: { targetWidth: 512, outExt: 'webp' },
  favicon: { targetWidth: 64, outExt: 'webp' },
  icon: { targetWidth: 128, outExt: 'webp' },
  background: { targetWidth: 1920, outExt: 'webp' },
};

function maxBytesFor(kind: AssetKind, sec: UploadSecurity): number {
  switch (kind) {
    case 'logo':
      return sec.maxBytesLogo;
    case 'favicon':
      return sec.maxBytesFavicon;
    case 'icon':
      return sec.maxBytesIcon;
    case 'background':
      return sec.maxBytesBackground;
  }
}

// DOMPurify singleton (jsdom is heavy; reuse)
const jsdomWindow = new JSDOM('').window;
// @ts-expect-error JSDOM window is structurally compatible
const purify = createDOMPurify(jsdomWindow);

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

function newStoredName(ext: string): string {
  return `${crypto.randomUUID()}.${ext}`;
}

async function sanitizeSvg(input: string): Promise<string> {
  return purify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus'],
  });
}

/** Minimal script/event removal for the no-sanitize path. */
function svgNoScripts(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

export async function processAndStore(
  file: File,
  kind: AssetKind,
): Promise<ProcessedAsset> {
  const limits = STATIC[kind];
  if (!limits) throw new UploadError(`Tipo de asset inválido: ${kind}`, 400);

  const cfg = await getConfig();
  const sec = cfg.security.uploads;
  const maxBytes = maxBytesFor(kind, sec);
  const allowed = new Set(sec.allowedMimeTypes);

  // 1) Size cap
  if (file.size === 0) throw new UploadError('Archivo vacío', 400);
  if (file.size > maxBytes) {
    throw new UploadError(
      `Archivo demasiado grande (${(file.size / 1024).toFixed(0)} KB). Máximo ${(
        maxBytes / 1024
      ).toFixed(0)} KB para ${kind}.`,
      413,
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // 2) MIME sniff from bytes (never trust Content-Type)
  const detected = await fileTypeFromBuffer(buf);
  let mime: string;

  if (detected && allowed.has(detected.mime)) {
    mime = detected.mime;
  } else {
    // Fallback: check if SVG by content sniff (no magic number for SVG)
    const head = buf.subarray(0, 512).toString('utf8').trimStart();
    if (
      (head.startsWith('<svg') || head.startsWith('<?xml')) &&
      sec.allowSvg &&
      allowed.has('image/svg+xml')
    ) {
      mime = 'image/svg+xml';
    } else {
      throw new UploadError(
        `Tipo de archivo no permitido. Aceptados: ${[...allowed].join(', ')}.`,
        415,
      );
    }
  }

  if (!allowed.has(mime)) {
    throw new UploadError(`Tipo no permitido: ${mime}`, 415);
  }
  if (mime === 'image/svg+xml' && !sec.allowSvg) {
    throw new UploadError(
      'SVG no está permitido (config.security.uploads.allowSvg = false)',
      415,
    );
  }

  // 3) Process / sanitize
  let outBuffer: Buffer;
  let storedExt: string;
  let sanitized = false;

  if (mime === 'image/svg+xml') {
    const cleaned = sec.sanitizeSvg
      ? await sanitizeSvg(buf.toString('utf8'))
      : svgNoScripts(buf.toString('utf8'));
    outBuffer = Buffer.from(cleaned, 'utf8');
    storedExt = 'svg';
    sanitized = true;
  } else if (sec.processImages) {
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
  } else {
    // No processing — write original bytes.
    outBuffer = buf;
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    storedExt = extMap[mime] || 'bin';
  }

  // 4) Write to disk
  const storedName = newStoredName(storedExt);
  const target = path.join(UPLOADS_DIR, storedName);
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
