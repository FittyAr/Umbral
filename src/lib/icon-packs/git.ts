/**
 * Extracción de SVGs clonando el repo con el `git` del sistema.
 *
 * Es el fallback del ZIP (y el camino preferido para dashboard-icons, que
 * en ZIP no trae la subcarpeta esperada). Ejecuta un binario externo, así
 * que corre siempre con `GIT_TERMINAL_PROMPT=0` y timeouts.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  type ExtractedSvg,
  formatExecError,
  isValidSvg,
  MAX_SVG_BYTES,
  MAX_SVG_FILES,
  MAX_TOTAL_SVG_BYTES,
} from './svg.ts';

const execFileAsync = promisify(execFile);

const GIT_CLONE_TIMEOUT_MS = 120_000;
const GIT_SPARSE_TIMEOUT_MS = 60_000;

/** Clona de forma superficial y sparse usando Git CLI en el directorio temporal del SO */
export async function extractSvgsFromGit(
  repoUrl: string,
  branch: string,
  targetSubpath?: string,
): Promise<ExtractedSvg[]> {
  const tempDir = path.join(os.tmpdir(), `umbral-pack-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  let lastError: Error | null = null;

  try {
    const cloneArgs = ['clone', '--depth', '1', '--filter=blob:none', '--sparse'];
    if (branch) cloneArgs.push('--branch', branch);
    // El `--` cierra la lista de opciones: sin él, una URL que empieza con
    // `-` la parsea git como flag. La URL además ya viene validada
    // (lib/icon-packs/validate.ts); esto es el cinturón sobre los tiradores.
    cloneArgs.push('--', repoUrl, tempDir);

    try {
      await execFileAsync('git', cloneArgs, { env: gitEnv, timeout: GIT_CLONE_TIMEOUT_MS });
      if (targetSubpath) {
        const normSub = targetSubpath.replace(/^[/\\]+|[/\\]+$/g, '');
        await execFileAsync('git', ['sparse-checkout', 'set', normSub], {
          cwd: tempDir,
          env: gitEnv,
          timeout: GIT_SPARSE_TIMEOUT_MS,
        });
      }
    } catch (sparseErr) {
      lastError = new Error(`Git sparse clone falló: ${formatExecError(sparseErr)}`);
      console.error('[umbral] git sparse clone failed:', sparseErr);
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      const standardArgs = ['clone', '--depth', '1'];
      if (branch) standardArgs.push('--branch', branch);
      standardArgs.push('--', repoUrl, tempDir);
      try {
        await execFileAsync('git', standardArgs, { env: gitEnv, timeout: GIT_CLONE_TIMEOUT_MS });
        lastError = null;
      } catch (standardErr) {
        throw new Error(`Git clone falló: ${formatExecError(standardErr)}`);
      }
    }

    const searchRoot = targetSubpath ? path.join(tempDir, targetSubpath) : tempDir;
    // El subpath puede ser un symlink dentro del repo (`icons -> /`):
    // readdir lo sigue y el recorrido salía del clone hacia el filesystem del
    // host. Se resuelve y se exige que quede dentro del clone.
    const realTemp = await fs.realpath(tempDir);
    const realRoot = await fs.realpath(searchRoot).catch(() => null);
    if (!realRoot || (realRoot !== realTemp && !realRoot.startsWith(realTemp + path.sep))) {
      throw new Error(`La subcarpeta "${targetSubpath}" no existe dentro del repositorio.`);
    }
    const results: ExtractedSvg[] = [];
    let totalBytes = 0;

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
          // Mismos topes que la extracción del ZIP.
          const st = await fs.stat(fullPath);
          if (st.size > MAX_SVG_BYTES) continue;
          totalBytes += st.size;
          if (totalBytes > MAX_TOTAL_SVG_BYTES || results.length >= MAX_SVG_FILES) {
            throw new Error('El repositorio supera el tamaño máximo permitido para un pack de íconos.');
          }
          const content = await fs.readFile(fullPath, 'utf8');
          if (isValidSvg(content)) {
            results.push({ name: entry.name, content });
          }
        }
      }
    }

    await walk(realRoot);
    if (results.length === 0) {
      // El cast mantiene el tipo declarado: el análisis de flujo cree que acá
      // sólo puede ser null, pero el clone sparse pudo haberlo seteado antes
      // de que el clone estándar tuviera éxito.
      const failure = lastError as Error | null;
      const hint = failure ? ` (${failure.message})` : '';
      throw new Error(
        `Git clone completó pero no se encontraron SVG válidos en "${targetSubpath || '/'}".${hint}`,
      );
    }
    return results;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
