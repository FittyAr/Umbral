/**
 * Instalación y desinstalación de packs.
 *
 * Cada pack vive en su propia carpeta bajo `data/icon-packs/<packId>/`, y
 * los nombres de archivo pasan por `sanitizeIconFileName` antes de escribir:
 * es lo que evita que un repo hostil escriba fuera de esa carpeta.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PREDEFINED_ICON_PACKS, type IconPackDefinition } from './catalog.ts';
import {
  PROTECTED_FILES,
  getDataDir,
  getIconPacksDir,
  getInstalledPacks,
  getLegacyInstalledPacksFile,
  saveInstalledPacks,
} from './registry.ts';
import { type ExtractedSvg, sanitizeIconFileName } from './svg.ts';
import { extractSvgsFromZip } from './zip.ts';
import { extractSvgsFromGit } from './git.ts';
import { validateBranch, validatePrefix, validateRepoUrl, validateSubpath } from './validate.ts';

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

  const rawRepoUrl = (packDef ? packDef.repoUrl : options.repoUrl || '').trim();
  if (!rawRepoUrl) {
    throw new Error('Se requiere un ID de paquete válido o una URL de repositorio Git.');
  }

  // Los packs del catálogo son constantes del código; lo que viene del body
  // del request se valida antes de llegar a `git` o a un `path.join`.
  const repoUrl = packDef ? rawRepoUrl : validateRepoUrl(rawRepoUrl);
  const branch = packDef ? packDef.branch.trim() : validateBranch(options.branch);
  const subpath = packDef ? packDef.subpath : validateSubpath(options.subpath);
  const prefix = packDef ? options.prefix : validatePrefix(options.prefix);

  const packId = packDef ? packDef.id : `custom-${Date.now().toString(36)}`;
  const packName = packDef ? packDef.name : `Repositorio (${repoUrl})`;
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
  const namePrefix = prefix ? `${prefix}-` : '';

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
