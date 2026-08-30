/**
 * Extracción de SVGs desde el archivo ZIP del repo (GitHub codeload o el
 * archive de GitLab). Es el camino preferido: no necesita `git` instalado.
 */
import { promises as fs, createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import AdmZip from 'adm-zip';
import { type ExtractedSvg, isValidSvg } from './svg.ts';

const ZIP_DOWNLOAD_TIMEOUT_MS = 180_000;

/** Resuelve la URL del archivo ZIP para GitHub (codeload) o GitLab. */
export function resolveZipArchiveUrl(repoUrl: string, branch: string): string | null {
  const cleanRepo = repoUrl.replace(/\.git$/, '').replace(/\/+$/, '');
  if (cleanRepo.includes('github.com')) {
    const match = cleanRepo.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!match) return null;
    const [, owner, repo] = match;
    return `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
  }
  if (cleanRepo.includes('gitlab.com')) {
    return `${cleanRepo}/-/archive/${branch}/${branch}.zip`;
  }
  return null;
}

async function downloadToTempFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Umbral-Icon-Pack-Downloader' },
    redirect: 'follow',
    signal: AbortSignal.timeout(ZIP_DOWNLOAD_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(
      `Descarga ZIP fallida (${res.status} ${res.statusText}) desde ${url}`,
    );
  }

  if (!res.body) {
    throw new Error(`Respuesta ZIP vacía desde ${url}`);
  }

  await pipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), createWriteStream(destPath));
}

function parseSvgsFromZipFile(zipPath: string, targetSubpath?: string): ExtractedSvg[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const normSubpath = targetSubpath ? targetSubpath.toLowerCase().replace(/^[/\\]+|[/\\]+$/g, '') : '';

  const results: ExtractedSvg[] = [];
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const entryName = entry.entryName.toLowerCase();
    if (!entryName.endsWith('.svg')) continue;
    if (normSubpath && !entryName.includes(normSubpath)) continue;

    const content = entry.getData().toString('utf8');
    if (isValidSvg(content)) {
      results.push({
        name: path.basename(entry.entryName),
        content,
      });
    }
  }

  return results;
}

/** Descarga el ZIP a disco y extrae archivos SVG (GitHub codeload / GitLab archive). */
export async function extractSvgsFromZip(
  repoUrl: string,
  branch: string,
  targetSubpath?: string,
): Promise<ExtractedSvg[]> {
  const zipUrl = resolveZipArchiveUrl(repoUrl, branch);
  if (!zipUrl) {
    throw new Error(`No se pudo resolver URL de archivo ZIP para ${repoUrl}`);
  }

  const tempZip = path.join(
    os.tmpdir(),
    `umbral-pack-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.zip`,
  );

  try {
    await downloadToTempFile(zipUrl, tempZip);
    const results = parseSvgsFromZipFile(tempZip, targetSubpath);
    if (results.length === 0) {
      throw new Error(
        `El archivo ZIP desde ${zipUrl} no contiene SVG válidos en la subcarpeta "${targetSubpath || '/'}".`,
      );
    }
    return results;
  } catch (err) {
    console.error('[umbral] extractSvgsFromZip failed:', err);
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    try {
      await fs.rm(tempZip, { force: true });
    } catch {
      // ignore
    }
  }
}
