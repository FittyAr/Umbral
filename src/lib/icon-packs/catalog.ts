/**
 * Catálogo de packs de íconos: los tipos y la lista de repos conocidos.
 *
 * Es data, no comportamiento: separarla del instalador (que ejecuta `git` y
 * escribe SVGs a disco) deja el código con superficie de riesgo aislado en
 * sus propios módulos.
 */

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
