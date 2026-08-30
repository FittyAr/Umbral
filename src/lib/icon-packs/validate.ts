/**
 * Validación de los parámetros de instalación de un pack.
 *
 * El endpoint pasaba el body del request tal cual a `installIconPack`, y de
 * ahí `repoUrl` y `branch` llegaban a `execFile('git', [...])`. `execFile` no
 * abre un shell, pero eso no alcanza: git parsea sus propias opciones, así
 * que un `repoUrl` que empieza con `--` se consume como flag
 * (`--upload-pack=<cmd>` ejecuta un comando), y el transporte `ext::` de git
 * hace lo mismo por otra vía. Con esto un admin del panel podía llegar a
 * ejecutar comandos en el contenedor.
 *
 * Los packs del catálogo no pasan por acá: sus URLs son constantes del
 * código, no entrada del usuario.
 */

/** Ramas y tags: letras, números y los separadores que git acepta. */
const BRANCH_RE = /^[A-Za-z0-9][\w.\/-]{0,99}$/;

export class IconPackInputError extends Error {}

/**
 * Acepta sólo URLs http(s) con host. Descarta de una `ext::`, `file://`,
 * `ssh://`, los scp-like (`git@host:repo`) y cualquier cosa que git pueda
 * leer como opción.
 */
export function validateRepoUrl(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('-')) {
    throw new IconPackInputError('La URL del repositorio no puede empezar con "-".');
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new IconPackInputError('URL de repositorio inválida. Usá una URL https completa.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new IconPackInputError(`Protocolo ${parsed.protocol} no permitido: sólo http o https.`);
  }
  if (!parsed.hostname) {
    throw new IconPackInputError('La URL del repositorio no tiene host.');
  }
  // Las credenciales embebidas irían al proceso git y a los logs.
  if (parsed.username || parsed.password) {
    throw new IconPackInputError('La URL no puede llevar usuario ni contraseña.');
  }
  return value;
}

/** Rama o tag. Vacío devuelve `main`, que es el default histórico. */
export function validateBranch(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return 'main';
  if (!BRANCH_RE.test(value) || value.includes('..')) {
    throw new IconPackInputError(`Rama inválida: "${value}".`);
  }
  return value;
}

/**
 * Subcarpeta dentro del repo. Se usa en un `path.join` contra el directorio
 * temporal del clon, así que un `../..` haría que la búsqueda de SVGs saliera
 * de ahí.
 */
export function validateSubpath(raw: string | undefined): string | undefined {
  const value = (raw ?? '').trim().replace(/^[/\\]+|[/\\]+$/g, '');
  if (!value) return undefined;
  const segments = value.split(/[/\\]+/);
  for (const segment of segments) {
    // El primer carácter tiene que ser alfanumérico: un segmento que empieza
    // con `-` lo tomaría como opción el `git sparse-checkout set`.
    if (segment === '.' || segment === '..' || !/^[A-Za-z0-9][\w.-]*$/.test(segment)) {
      throw new IconPackInputError(`Subcarpeta inválida: "${raw}".`);
    }
  }
  return segments.join('/');
}

/** Prefijo de los nombres de archivo instalados. */
export function validatePrefix(raw: string | undefined): string | undefined {
  const value = (raw ?? '').trim();
  if (!value) return undefined;
  if (!/^[a-z0-9-]{1,24}$/i.test(value)) {
    throw new IconPackInputError('El prefijo sólo admite letras, números y guiones (máx. 24).');
  }
  return value.toLowerCase();
}
