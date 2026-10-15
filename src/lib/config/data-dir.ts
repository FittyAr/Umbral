/**
 * Resolución del directorio de datos (`DATA_DIR`).
 *
 * Orden:
 *   1. `DATA_DIR` definido → se usa tal cual (Docker fija `/app/data`).
 *   2. Instalación previa: `./data` (relativo al cwd) existe con contenido y
 *      la ruta estándar todavía no existe → se sigue usando `./data` y se
 *      avisa por consola cómo migrar. Nunca se mueve ni se borra nada solo.
 *   3. Ruta estándar de FittyAr por sistema operativo:
 *        - Windows: `%APPDATA%\FittyAr\Umbral`
 *        - macOS:   `~/Library/Application Support/FittyAr/Umbral`
 *        - Linux/otros: `$XDG_DATA_HOME/FittyAr/Umbral`
 *          (default `~/.local/share/FittyAr/Umbral`)
 *
 * Sin dependencias del resto de la app: la importan módulos que también
 * corren bajo `node --test`.
 */
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const VENDOR_DIR = 'FittyAr';
export const APP_DIR = 'Umbral';

export interface DataDirInputs {
  env: Record<string, string | undefined>;
  platform: NodeJS.Platform;
  cwd: string;
  homedir: string;
  /** ¿Existe el path? */
  exists: (p: string) => boolean;
  /** Entradas de un directorio ([] si no existe o no se puede leer). */
  list: (p: string) => string[];
}

export type DataDirSource = 'env' | 'legacy' | 'standard';

export interface DataDirResolution {
  dir: string;
  source: DataDirSource;
  /** Ruta estándar del SO (aunque no sea la elegida). */
  standardDir: string;
}

/** Ruta estándar de datos de usuario para Umbral según el SO. */
export function standardDataDir(
  inputs: Pick<DataDirInputs, 'env' | 'platform' | 'homedir'>,
): string {
  const { env, platform, homedir } = inputs;
  if (platform === 'win32') {
    const p = path.win32;
    const base = env.APPDATA || p.join(homedir, 'AppData', 'Roaming');
    return p.join(base, VENDOR_DIR, APP_DIR);
  }
  const p = path.posix;
  if (platform === 'darwin') {
    return p.join(homedir, 'Library', 'Application Support', VENDOR_DIR, APP_DIR);
  }
  // XDG: sólo vale si es absoluto (la spec manda ignorar rutas relativas).
  const xdg = env.XDG_DATA_HOME;
  const base = xdg && p.isAbsolute(xdg) ? xdg : p.join(homedir, '.local', 'share');
  return p.join(base, VENDOR_DIR, APP_DIR);
}

// Archivos que no indican una instalación previa (vienen con el repo o los
// crea el SO).
const IGNORED_ENTRIES = new Set(['.gitkeep', '.DS_Store', 'Thumbs.db', 'desktop.ini']);

/** Resolución pura (testeable): no toca el disco salvo a través de `inputs`. */
export function computeDataDir(inputs: DataDirInputs): DataDirResolution {
  const standardDir = standardDataDir(inputs);
  const fromEnv = inputs.env.DATA_DIR;
  if (fromEnv) return { dir: fromEnv, source: 'env', standardDir };

  const legacyDir = path.join(inputs.cwd, 'data');
  const legacyHasContent = inputs.list(legacyDir).some((e) => !IGNORED_ENTRIES.has(e));
  if (legacyHasContent && !inputs.exists(standardDir)) {
    return { dir: legacyDir, source: 'legacy', standardDir };
  }
  return { dir: standardDir, source: 'standard', standardDir };
}

function realInputs(): DataDirInputs {
  return {
    env: process.env,
    platform: process.platform,
    cwd: process.cwd(),
    homedir: os.homedir(),
    exists: existsSync,
    list: (p) => {
      try {
        return readdirSync(p);
      } catch {
        return [];
      }
    },
  };
}

let warnedLegacy = false;

/**
 * Directorio de datos efectivo. Se evalúa en cada llamada (los tests cambian
 * `DATA_DIR` entre casos); el aviso de instalación legacy sale una sola vez.
 */
export function resolveDataDir(): string {
  const res = computeDataDir(realInputs());
  if (res.source === 'legacy' && !warnedLegacy) {
    warnedLegacy = true;
    console.warn(
      `[umbral] Usando el directorio de datos existente ${res.dir} (instalación previa). ` +
        `La ubicación estándar ahora es ${res.standardDir}. Para migrar: detené Umbral, ` +
        `mové el contenido de ${res.dir} a ${res.standardDir} y volvé a arrancar ` +
        `(o fijá DATA_DIR para elegir la carpeta explícitamente).`,
    );
  }
  return res.dir;
}
