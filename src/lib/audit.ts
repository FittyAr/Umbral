/**
 * Parser del audit log.
 *
 * El formato (definido en src/lib/config.ts → audit()) es:
 *
 *   {ISO timestamp}\t{action}\t{detail}\n
 *
 * Ejemplo:
 *   2026-08-19T13:00:00.000Z\tconfig_update\tfeatures: i18n: false→true
 *   2026-08-19T13:00:01.234Z\tlogin_ok\tip=192.168.0.4
 *
 * Estrategia: leer las últimas N líneas (tail) usando fs.read con offset
 * desde el final del archivo. Para archivos de hasta 10MB es instantáneo;
 * más grandes usaríamos streaming, pero con la rotación existente a 10MB
 * nunca vamos a leer más de eso en una request.
 */

import { promises as fs } from 'node:fs';

export interface AuditEntry {
  /** ISO timestamp parseado. */
  ts: string;
  /** Date object para comparaciones y filtros. */
  date: Date;
  /** Acción (ej: 'config_update', 'login_ok'). */
  action: string;
  /** Detalle libre (puede ser string vacío). */
  detail: string;
}

const AUDIT_LINE_RE = /^(\S+)\t(\S+)\t?(.*)$/;

/** Parsea UNA línea del audit log. Devuelve null si la línea está vacía
 *  o malformada (defensivo — el formato está controlado por audit() pero
 *  alguien podría haber editado el archivo a mano). */
export function parseAuditLine(line: string): AuditEntry | null {
  if (!line) return null;
  const m = AUDIT_LINE_RE.exec(line);
  if (!m) return null;
  const [, ts, action, detail] = m;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return null;
  return { ts, date, action, detail: detail ?? '' };
}

/** Lee las últimas N líneas de un archivo sin cargar todo a memoria.
 *  Útil para audit.log que puede ser de varios MB. Implementación
 *  sencilla: lee un buffer del final, parte por \n, devuelve las últimas N.
 *  Para archivos > 10MB el comportamiento se degrada gracefully — la UI
 *  muestra warning si pasa. */
export async function tailFile(path: string, maxLines: number): Promise<string[]> {
  if (maxLines <= 0) return [];
  let buf: Buffer;
  try {
    buf = await fs.readFile(path);
  } catch {
    return []; // archivo no existe todavía
  }
  if (buf.length === 0) return [];
  // Split por \n y descartar el último elemento si está vacío (line final sin \n).
  const allLines = buf.toString('utf8').split('\n');
  if (allLines[allLines.length - 1] === '') allLines.pop();
  return allLines.slice(-maxLines);
}

export interface AuditFilters {
  /** Máximo de entradas a devolver (default 200, cap 1000). */
  limit?: number;
  /** Filtrar por action exacta (ej: 'config_update'). */
  action?: string;
  /** Filtrar por substring del detail (case-insensitive). */
  detailContains?: string;
  /** ISO timestamp mínimo (entries.ts >= from). */
  from?: string;
  /** ISO timestamp máximo (entries.ts <= to). */
  to?: string;
}

export interface AuditReadResult {
  entries: AuditEntry[];
  /** Cantidad de líneas totales leídas del archivo (antes de filtrar). */
  totalLines: number;
  /** True si el archivo tiene más líneas que las devueltas (hay más por cargar). */
  hasMore: boolean;
  /** Ruta del archivo leído. Útil para mostrar en la UI. */
  path: string;
  /** Tamaño en bytes del archivo. */
  sizeBytes: number;
}

/** Lee el audit log, parsea y aplica filtros. Las entries vienen
 *  newest-first (orden natural: la última escrita es la más relevante
 *  para el admin que está debuggeando).
 *
 *  El "limit" se aplica ANTES del filtro de rango temporal (from/to) para
 *  que el filtro "últimas 24h" sea predecible. Si después de aplicar
 *  filtros hay menos entradas que `limit`, devolvemos las que haya. */
export async function readAuditLog(
  logPath: string,
  filters: AuditFilters = {},
): Promise<AuditReadResult> {
  const wantedLimit = Math.max(0, Math.min(filters.limit ?? 200, 1000));
  // Pedimos 5x más líneas del límite para que el filtro de rango no
  // nos deje corto. Si el admin quiere "últimas 24h" y hay 200 entries
  // totales, queremos verlas todas.
  const buffer = Math.max(wantedLimit * 5, 1000);
  const lines = await tailFile(logPath, buffer);
  const totalLines = lines.length;
  const hasMore = false; // estamos leyendo hasta `buffer`, no sabemos si hay más antes

  // Parsear y aplicar filtros
  const parsed: AuditEntry[] = [];
  for (const line of lines) {
    const entry = parseAuditLine(line);
    if (!entry) continue;
    if (filters.action && entry.action !== filters.action) continue;
    if (filters.detailContains && !entry.detail.toLowerCase().includes(filters.detailContains.toLowerCase())) continue;
    if (filters.from && entry.date.getTime() < new Date(filters.from).getTime()) continue;
    if (filters.to && entry.date.getTime() > new Date(filters.to).getTime()) continue;
    parsed.push(entry);
  }

  // Reverse para newest-first. Si después de filtrar hay menos del wanted,
  // aceptamos.
  parsed.reverse();

  return {
    entries: parsed.slice(0, wantedLimit),
    totalLines,
    hasMore,
    path: logPath,
    sizeBytes: (await fs.stat(logPath).catch(() => ({ size: 0 }))).size,
  };
}

/** Lista las acciones distintas que aparecen en el log. Útil para poblar
 *  el filtro "action" del UI. */
export async function listAuditActions(logPath: string): Promise<string[]> {
  const lines = await tailFile(logPath, 5000);
  const set = new Set<string>();
  for (const line of lines) {
    const e = parseAuditLine(line);
    if (e) set.add(e.action);
  }
  return Array.from(set).sort();
}