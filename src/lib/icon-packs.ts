import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PUBLIC_ICONS_DIR = path.join(process.cwd(), 'public', 'icons');
const INSTALLED_PACKS_FILE = path.join(PUBLIC_ICONS_DIR, '.installed-packs.json');

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
    const raw = await fs.readFile(INSTALLED_PACKS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Guarda el registro de packs instalados */
async function saveInstalledPacks(records: Record<string, InstalledPackRecord>): Promise<void> {
  await fs.mkdir(PUBLIC_ICONS_DIR, { recursive: true });
  await fs.writeFile(INSTALLED_PACKS_FILE, JSON.stringify(records, null, 2), 'utf8');
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

  // Contar cuántos SVGs totales hay en public/icons
  let totalInstalledIcons = 0;
  try {
    const files = await fs.readdir(PUBLIC_ICONS_DIR);
    totalInstalledIcons = files.filter((f) => f.endsWith('.svg')).length;
  } catch {
    totalInstalledIcons = 0;
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

/** Valida que un buffer o string sea un SVG bien formado */
function isValidSvg(content: string): boolean {
  const lower = content.toLowerCase();
  return lower.includes('<svg') && lower.includes('</svg>');
}

/** Intenta clonar con Git CLI */
async function tryGitClone(repoUrl: string, targetDir: string, branch?: string): Promise<boolean> {
  try {
    const args = ['clone', '--depth', '1'];
    if (branch) {
      args.push('--branch', branch);
    }
    args.push(repoUrl, targetDir);
    await execFileAsync('git', args, { timeout: 60_000 });
    return true;
  } catch {
    return false;
  }
}

/** Descarga y descomprime un archivo ZIP usando AdmZip */
async function downloadAndExtractZip(
  zipUrl: string,
  targetDir: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const res = await fetch(zipUrl, {
      headers: { 'User-Agent': 'Umbral-Icon-Pack-Downloader' },
      redirect: 'follow',
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      return { success: false, error: `Error HTTP ${res.status} al descargar archivo ZIP.` };
    }

    const arrayBuffer = await res.arrayBuffer();
    const zip = new AdmZip(Buffer.from(arrayBuffer));
    zip.extractAllTo(targetDir, true);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al procesar archivo ZIP.' };
  }
}

/** Recorre recursivamente un directorio buscando archivos .svg */
async function findSvgFiles(
  dir: string,
  targetSubpath?: string,
): Promise<Array<{ relativePath: string; absolutePath: string }>> {
  const results: Array<{ relativePath: string; absolutePath: string }> = [];

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
        results.push({
          relativePath: path.relative(dir, fullPath).replace(/\\/g, '/'),
          absolutePath: fullPath,
        });
      }
    }
  }

  await walk(dir);

  if (targetSubpath) {
    const normSubpath = targetSubpath.toLowerCase().replace(/^[/\\]+|[/\\]+$/g, '');
    const filtered = results.filter((item) =>
      item.relativePath.toLowerCase().includes(normSubpath),
    );
    if (filtered.length > 0) return filtered;
  }

  return results;
}

/** Instala un paquete de íconos predefinido o desde URL Git */
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
  await fs.mkdir(PUBLIC_ICONS_DIR, { recursive: true });

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

  const tempDir = path.join(PUBLIC_ICONS_DIR, `.temp-pack-${Date.now()}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    // Estrategia 1: Intentar git clone
    let downloaded = await tryGitClone(repoUrl, tempDir, branch);

    // Estrategia 2: Si git falló, descargar ZIP de GitHub / GitLab
    if (!downloaded) {
      let zipUrl = '';
      if (repoUrl.includes('github.com')) {
        const cleanRepo = repoUrl.replace(/\.git$/, '').replace(/\/+$/, '');
        zipUrl = `${cleanRepo}/archive/refs/heads/${branch}.zip`;
      } else if (repoUrl.includes('gitlab.com')) {
        const cleanRepo = repoUrl.replace(/\.git$/, '').replace(/\/+$/, '');
        zipUrl = `${cleanRepo}/-/archive/${branch}/${branch}.zip`;
      }

      if (zipUrl) {
        const zipResult = await downloadAndExtractZip(zipUrl, tempDir);
        downloaded = zipResult.success;
      }
    }

    if (!downloaded) {
      throw new Error(
        `No se pudo descargar el repositorio desde ${repoUrl}. Verificá la URL, la rama y tu conexión a internet.`,
      );
    }

    // Buscar todos los archivos SVG dentro del repositorio descargado
    const svgFiles = await findSvgFiles(tempDir, subpath);
    if (svgFiles.length === 0) {
      throw new Error('No se encontraron archivos SVG en el repositorio descargado.');
    }

    const installedFiles: string[] = [];
    const namePrefix = options.prefix ? `${options.prefix}-` : '';

    for (const item of svgFiles) {
      try {
        const content = await fs.readFile(item.absolutePath, 'utf8');
        if (!isValidSvg(content)) continue;

        const baseFileName = sanitizeIconFileName(item.absolutePath);
        const finalFileName = namePrefix + baseFileName;

        if (PROTECTED_FILES.has(finalFileName)) continue;

        const destPath = path.join(PUBLIC_ICONS_DIR, finalFileName);
        await fs.writeFile(destPath, content, 'utf8');
        installedFiles.push(finalFileName);
      } catch {
        // Ignorar archivo corrupto
      }
    }

    if (installedFiles.length === 0) {
      throw new Error('No se pudo procesar ningún ícono SVG válido del paquete.');
    }

    // Registrar en .installed-packs.json
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
  } finally {
    // Limpieza de directorio temporal
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

/** Desinstala un paquete de íconos previamente instalado */
export async function uninstallIconPack(packId: string): Promise<{
  success: boolean;
  iconsRemoved: number;
  message: string;
}> {
  const records = await getInstalledPacks();
  const record = records[packId];

  if (!record) {
    throw new Error('El paquete especificado no se encuentra instalado.');
  }

  let removedCount = 0;
  for (const filename of record.files) {
    if (PROTECTED_FILES.has(filename)) continue;
    try {
      const filePath = path.join(PUBLIC_ICONS_DIR, filename);
      await fs.unlink(filePath);
      removedCount++;
    } catch {
      // ya no existe
    }
  }

  delete records[packId];
  await saveInstalledPacks(records);

  return {
    success: true,
    iconsRemoved: removedCount,
    message: `Se eliminaron ${removedCount} íconos del paquete ${record.name}.`,
  };
}
