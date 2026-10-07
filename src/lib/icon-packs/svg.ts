/**
 * Saneamiento de nombres de archivo, validación de SVG y formato de errores
 * de `git`.
 */
import path from 'node:path';

/** Topes de un pack: un repo enorme (o un zip bomb) no puede llenar la
 *  memoria ni el disco. Los packs reales del catálogo están muy por debajo. */
export const MAX_SVG_BYTES = 1024 * 1024; // por archivo
export const MAX_TOTAL_SVG_BYTES = 200 * 1024 * 1024; // suma extraída
export const MAX_SVG_FILES = 50_000;
export const MAX_ARCHIVE_BYTES = 300 * 1024 * 1024; // ZIP descargado

/** Sanitiza el nombre de archivo a kebab-case válido para ícono */
export function sanitizeIconFileName(filename: string): string {
  const base = path.basename(filename, '.svg');
  const clean = base
    .toLowerCase()
    .trim()
    .replace(/[_\s.]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (clean || 'icon') + '.svg';
}

/** Valida que un string sea un SVG bien formado */
export function isValidSvg(content: string): boolean {
  const lower = content.toLowerCase();
  return lower.includes('<svg') && lower.includes('</svg>');
}

export interface ExtractedSvg {
  name: string;
  content: string;
}

export function formatExecError(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err);
  const e = err as { message?: string; stderr?: string; code?: string };
  const parts = [e.message, e.stderr].filter(Boolean);
  if (e.code === 'ENOENT') {
    parts.unshift('git no está instalado o no está en PATH');
  }
  return parts.join(' — ') || 'Error desconocido';
}
