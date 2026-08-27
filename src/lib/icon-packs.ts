import { promises as fs, createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import AdmZip from 'adm-zip';

const execFileAsync = promisify(execFile);

function getDataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), 'data');
}

function getIconPacksDir(): string {
  return path.join(getDataDir(), 'icon-packs');
}

function getPrimaryInstalledPacksFile(): string {
  return path.join(getIconPacksDir(), '.installed-packs.json');
}

function getLegacyInstalledPacksFile(): string {
  return path.join(getDataDir(), '.installed-packs.json');
}

const ZIP_DOWNLOAD_TIMEOUT_MS = 180_000;
const GIT_CLONE_TIMEOUT_MS = 120_000;
const GIT_SPARSE_TIMEOUT_MS = 60_000;

const PROTECTED_FILES = new Set([
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  '.installed-packs.json',
]);

export interface IconPackDefinition {
  id: string;
  name: string;
  description: string;
  repoUrl: string;
  branch: string;
  subpath: string;
  license: string;
  licenseUrl: string;
  author: string;
  websiteUrl?: string;
  estimatedCount: string;
  tags: string[];
}

export interface InstalledPackRecord {
  id: string;
  name: string;
  repoUrl: string;
  installedAt: string;
  iconsCount: number;
  license: string;
  files: string[];
}

export interface IconPackStatus extends IconPackDefinition {
  installed: boolean;
  installedAt?: string;
  installedCount?: number;
}

export const PREDEFINED_ICON_PACKS: ReadonlyArray<IconPackDefinition> = [
  {
    id: 'simple-icons',
    name: 'Simple Icons',
    description: 'Más de 3.100 íconos vectoriales SVG de marcas, herramientas de desarrollo, servicios web y aplicaciones populares.',
    repoUrl: 'https://github.com/simple-icons/simple-icons',
    branch: 'develop',
    subpath: 'icons',
    license: 'CC0 1.0 Universal (Dominio Público)',
    licenseUrl: 'https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md',
    author: 'Simple Icons Contributors',
    websiteUrl: 'https://simpleicons.org',
    estimatedCount: '3.100+',
    tags: ['marcas', 'logos', 'dev', 'cloud', 'social'],
  },
  {
    id: 'dashboard-icons',
    name: 'Dashboard Icons (Homelab & Self-Hosted)',
    description: 'Colección de más de 1.000 íconos vectoriales SVG de alta calidad diseñados especialmente para dashboards de homelab y servicios autohospedados.',
    repoUrl: 'https://github.com/walkxcode/dashboard-icons',
    branch: 'main',
    subpath: 'svg',
    license: 'MIT License',
    licenseUrl: 'https://github.com/walkxcode/dashboard-icons/blob/main/LICENSE',
    author: 'Walkx & Homelab Community',
    websiteUrl: 'https://github.com/walkxcode/dashboard-icons',
    estimatedCount: '1.000+',
    tags: ['homelab', 'self-hosted', 'servidores', 'docker'],
  },
  {
    id: 'lucide',
    name: 'Lucide Icons',
    description: 'Conjunto de más de 1.500 íconos de interfaz modernos, limpios, consistentes y bellos (evolución de Feather Icons).',
    repoUrl: 'https://github.com/lucide-icons/lucide',
    branch: 'main',
    subpath: 'icons',
    license: 'ISC License',
    licenseUrl: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE',
    author: 'Lucide Project',
    websiteUrl: 'https://lucide.dev',
    estimatedCount: '1.500+',
    tags: ['ui', 'sistema', 'minimalista', 'moderno'],
  },
  {
    id: 'tabler-icons',
    name: 'Tabler Icons',
    description: 'Más de 5.800 íconos SVG de interfaz de usuario limpios, altamente personalizables y pixel-perfect.',
    repoUrl: 'https://github.com/tabler/tabler-icons',
    branch: 'main',
    subpath: 'icons/outline',
    license: 'MIT License',
    licenseUrl: 'https://github.com/tabler/tabler-icons/blob/main/LICENSE',
    author: 'Paweł Kuna & Tabler Team',
    websiteUrl: 'https://tabler.io/icons',
    estimatedCount: '5.800+',
    tags: ['ui', 'outline', 'controles', 'general'],
  },
  {
    id: 'svg-icons',
    name: 'SVG-Icons (FontAwesome & Tech)',
    description: 'Colección curada de íconos SVG con logotipos de tecnología, redes sociales, marcas y glifos comunes.',
    repoUrl: 'https://github.com/svg-icons/svg-icons',
    branch: 'master',
    subpath: 'svg',
    license: 'MIT License',
    licenseUrl: 'https://github.com/svg-icons/svg-icons/blob/master/LICENSE',
    author: 'SVG-Icons Community',
    websiteUrl: 'https://github.com/svg-icons/svg-icons',
    estimatedCount: '1.200+',
    tags: ['logos', 'fontawesome', 'tecnología'],
  },
  {
    id: 'leungwensen-svg-icon',
    name: 'Leungwensen SVG-Icon',
    description: 'Gran compilación de íconos vectoriales SVG incluyendo Material Design, FontAwesome, Octicons y marcas.',
    repoUrl: 'https://github.com/leungwensen/svg-icon',
    branch: 'master',
    subpath: 'dist/svg',
    license: 'MIT License',
    licenseUrl: 'https://github.com/leungwensen/svg-icon/blob/master/LICENSE',
    author: 'Leung Wensen',
    websiteUrl: 'https://github.com/leungwensen/svg-icon',
    estimatedCount: '2.500+',
    tags: ['material', 'octicons', 'variados'],
  },
];

/** Lee el registro de packs instalados */
export async function getInstalledPacks(): Promise<Record<string, InstalledPackRecord>> {
  try {
    const raw = await fs.readFile(getPrimaryInstalledPacksFile(), 'utf8');
    return JSON.parse(raw);
  } catch {
    try {
      const raw = await fs.readFile(getLegacyInstalledPacksFile(), 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
}

/** Guarda el registro de packs instalados */
async function saveInstalledPacks(records: Record<string, InstalledPackRecord>): Promise<void> {
  await fs.mkdir(getIconPacksDir(), { recursive: true });
  await fs.writeFile(getPrimaryInstalledPacksFile(), JSON.stringify(records, null, 2), 'utf8');
}

/** Obtiene el listado completo de packs con su estado de instalación */
export async function listIconPacksWithStatus(): Promise<{
  packs: IconPackStatus[];
  totalInstalledIcons: number;
}> {
  const installed = await getInstalledPacks();
  const packs: IconPackStatus[] = PREDEFINED_ICON_PACKS.map((p) => {
    const inst = installed[p.id];
    return {
      ...p,
      installed: !!inst,
      installedAt: inst?.installedAt,
      installedCount: inst?.iconsCount,
    };
  });

  let totalInstalledIcons = 0;
  try {
    const entries = await fs.readdir(getIconPacksDir(), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const files = await fs.readdir(path.join(getIconPacksDir(), entry.name));
        for (const f of files) {
          if (f.endsWith('.svg') && !PROTECTED_FILES.has(f)) {
            totalInstalledIcons++;
          }
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return { packs, totalInstalledIcons };
}

/** Sanitiza el nombre de archivo a kebab-case válido para ícono */
function sanitizeIconFileName(filename: string): string {
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
function isValidSvg(content: string): boolean {
  const lower = content.toLowerCase();
  return lower.includes('<svg') && lower.includes('</svg>');
}

interface ExtractedSvg {
  name: string;
  content: string;
}

function formatExecError(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err);
  const e = err as { message?: string; stderr?: string; code?: string };
  const parts = [e.message, e.stderr].filter(Boolean);
  if (e.code === 'ENOENT') {
    parts.unshift('git no está instalado o no está en PATH');
  }
  return parts.join(' — ') || 'Error desconocido';
}

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
    cloneArgs.push(repoUrl, tempDir);

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
      standardArgs.push(repoUrl, tempDir);
      try {
        await execFileAsync('git', standardArgs, { env: gitEnv, timeout: GIT_CLONE_TIMEOUT_MS });
        lastError = null;
      } catch (standardErr) {
        throw new Error(`Git clone falló: ${formatExecError(standardErr)}`);
      }
    }

    const searchRoot = targetSubpath ? path.join(tempDir, targetSubpath) : tempDir;
    const results: ExtractedSvg[] = [];

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
          const content = await fs.readFile(fullPath, 'utf8');
          if (isValidSvg(content)) {
            results.push({ name: entry.name, content });
          }
        }
      }
    }

    await walk(searchRoot);
    if (results.length === 0) {
      const hint = lastError ? ` (${lastError.message})` : '';
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

async function collectSvgsFromRepo(
  repoUrl: string,
  branch: string,
  subpath?: string,
): Promise<ExtractedSvg[]> {
  const errors: string[] = [];

  if (repoUrl.includes('walkxcode/dashboard-icons')) {
    try {
      return await extractSvgsFromGit(repoUrl, branch, subpath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`git: ${msg}`);
      console.error('[umbral] dashboard-icons git attempt failed:', err);
    }
  }

  try {
    return await extractSvgsFromZip(repoUrl, branch, subpath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`zip: ${msg}`);
    console.error('[umbral] zip extraction failed:', err);
  }

  try {
    return await extractSvgsFromGit(repoUrl, branch, subpath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`git: ${msg}`);
    console.error('[umbral] git fallback failed:', err);
  }

  throw new Error(
    `No se pudieron obtener archivos SVG desde ${repoUrl} (rama ${branch}, subcarpeta ${subpath || '/'}). ` +
      `Detalle: ${errors.join(' | ')}`,
  );
}

/** Instala un paquete de íconos en una carpeta aislada bajo data/icon-packs/<packId>/ */
export async function installIconPack(options: {
  packId?: string;
  repoUrl?: string;
  branch?: string;
  subpath?: string;
  prefix?: string;
}): Promise<{
  success: boolean;
  packId: string;
  name: string;
  iconsInstalled: number;
  message: string;
}> {
  let packDef: IconPackDefinition | undefined;
  if (options.packId) {
    packDef = PREDEFINED_ICON_PACKS.find((p) => p.id === options.packId);
  }

  const repoUrl = (packDef ? packDef.repoUrl : options.repoUrl || '').trim();
  if (!repoUrl) {
    throw new Error('Se requiere un ID de paquete válido o una URL de repositorio Git.');
  }

  const packId = packDef ? packDef.id : `custom-${Date.now().toString(36)}`;
  const packName = packDef ? packDef.name : `Repositorio (${repoUrl})`;
  const branch = (packDef ? packDef.branch : options.branch || 'main').trim();
  const subpath = packDef ? packDef.subpath : options.subpath;
  const license = packDef ? packDef.license : 'Ver repositorio';

  const packDir = path.join(getIconPacksDir(), packId);
  await fs.mkdir(getIconPacksDir(), { recursive: true });

  // Reinstall: limpiar carpeta previa antes de escribir de nuevo
  try {
    await fs.rm(packDir, { recursive: true, force: true });
  } catch (err) {
    console.error('[umbral] failed to wipe pack dir before reinstall:', err);
    throw new Error(`No se pudo preparar la carpeta del paquete (${packDir}). Verificá permisos de escritura.`);
  }
  await fs.mkdir(packDir, { recursive: true });

  const svgs = await collectSvgsFromRepo(repoUrl, branch, subpath);

  const installedFiles: string[] = [];
  const namePrefix = options.prefix ? `${options.prefix}-` : '';

  const writeTasks: Array<{ destPath: string; content: string; fileName: string }> = [];
  for (const item of svgs) {
    const baseFileName = sanitizeIconFileName(item.name);
    const finalFileName = namePrefix + baseFileName;

    if (PROTECTED_FILES.has(finalFileName)) continue;

    writeTasks.push({
      destPath: path.join(packDir, finalFileName),
      content: item.content,
      fileName: finalFileName,
    });
    installedFiles.push(finalFileName);
  }

  if (installedFiles.length === 0) {
    throw new Error('No se pudo procesar ningún ícono SVG válido del paquete.');
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < writeTasks.length; i += BATCH_SIZE) {
    const batch = writeTasks.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (task) => {
        try {
          await fs.writeFile(task.destPath, task.content, 'utf8');
        } catch (err) {
          console.error('[umbral] failed to write icon file:', task.destPath, err);
          throw new Error(
            `No se pudo escribir el ícono ${task.fileName} en ${packDir}. Verificá permisos de ${getDataDir()}.`,
          );
        }
      }),
    );
  }

  const records = await getInstalledPacks();
  records[packId] = {
    id: packId,
    name: packName,
    repoUrl,
    installedAt: new Date().toISOString(),
    iconsCount: installedFiles.length,
    license,
    files: installedFiles,
  };
  await saveInstalledPacks(records);

  return {
    success: true,
    packId,
    name: packName,
    iconsInstalled: installedFiles.length,
    message: `Se instalaron correctamente ${installedFiles.length} íconos de ${packName}.`,
  };
}

/** Desinstala un paquete de íconos eliminando su carpeta dedicada en data/icon-packs/<packId>/ */
export async function uninstallIconPack(packId: string): Promise<{
  success: boolean;
  iconsRemoved: number;
  message: string;
}> {
  const records = await getInstalledPacks();
  const record = records[packId];

  const packDir = path.join(getIconPacksDir(), packId);
  try {
    await fs.rm(packDir, { recursive: true, force: true });
  } catch (err) {
    console.error('[umbral] failed to remove pack dir:', packDir, err);
    throw new Error(`No se pudo eliminar la carpeta del paquete (${packDir}). Verificá permisos.`);
  }

  if (record?.files) {
    const legacyDir = path.join(process.cwd(), 'public', 'icons');
    for (const filename of record.files) {
      if (PROTECTED_FILES.has(filename)) continue;
      try {
        await fs.unlink(path.join(legacyDir, filename));
      } catch {
        // ignore legacy cleanup failures
      }
    }
  }

  const removedCount = record?.iconsCount || 0;
  const packName = record?.name || packId;

  delete records[packId];
  await saveInstalledPacks(records);

  try {
    await fs.rm(getLegacyInstalledPacksFile(), { force: true });
  } catch {
    // ignore
  }

  return {
    success: true,
    iconsRemoved: removedCount,
    message: `Se eliminó el paquete ${packName}.`,
  };
}
