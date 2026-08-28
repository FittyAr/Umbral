import type { Theme } from './schema';
import { mergeThemePartial } from './theme-tokens.ts';

export type PresetColorMode = 'dark' | 'light';

type ModeTokenSet = NonNullable<NonNullable<Theme['tokens']>['dark']>;

function mt(partial: ModeTokenSet): ModeTokenSet {
  return partial;
}

export interface ThemePresetVariant {
  previewColors: [string, string, string];
  theme: Partial<Theme>;
}

export interface ThemePreset {
  id: string;
  nameKey: string;
  descriptionKey: string;
  thumbnail: 'gradient' | 'solid' | 'image';
  previewColors: Record<PresetColorMode, [string, string, string]>;
  theme: Partial<Theme>;
}

export const BUILTIN_THEME_PRESETS: ThemePreset[] = [
  {
    id: 'midnight',
    nameKey: 'admin.theme.preset.midnight.name',
    descriptionKey: 'admin.theme.preset.midnight.desc',
    thumbnail: 'gradient',
    previewColors: {
      dark: ['#0f172a', '#1e3a8a', '#0f172a'],
      light: ['#e2e8f0', '#93c5fd', '#dbeafe'],
    },
    theme: {
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
        blur: 0, overlay: 0, overlayColor: '#000000',
      },
      backgroundLight: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #e2e8f0 0%, #93c5fd 55%, #dbeafe 100%)',
        blur: 0, overlay: 0, overlayColor: '#ffffff',
      },
      cardStyle: 'glass',
      accentColor: '#60a5fa',
      fontFamily: 'Inter',
      colorMode: 'auto',
      tokens: {
        dark: mt({
          bg: '#0f172a', bgElev: '#1e293b',
          surface: 'rgba(255, 255, 255, 0.06)', surfaceHover: 'rgba(255, 255, 255, 0.10)', surfaceStrong: '#1e293b',
          text: '#f1f5f9', textMuted: '#cbd5e1', textSubtle: '#94a3b8', textFaint: '#64748b',
          border: 'rgba(255, 255, 255, 0.10)', borderStrong: 'rgba(255, 255, 255, 0.18)',
          accent: '#60a5fa', accentMuted: 'rgba(96, 165, 250, 0.15)', accentFg: '#ffffff',
        }),
        light: mt({
          bg: '#f1f5f9', bgElev: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.92)', surfaceHover: 'rgba(15, 23, 42, 0.04)', surfaceStrong: '#ffffff',
          text: '#0f172a', textMuted: '#334155', textSubtle: '#475569', textFaint: '#64748b',
          border: 'rgba(15, 23, 42, 0.10)', borderStrong: 'rgba(15, 23, 42, 0.18)',
          accent: '#2563eb', accentMuted: 'rgba(37, 99, 235, 0.12)', accentFg: '#ffffff',
        }),
      },
    },
  },
  {
    id: 'ocean',
    nameKey: 'admin.theme.preset.ocean.name',
    descriptionKey: 'admin.theme.preset.ocean.desc',
    thumbnail: 'gradient',
    previewColors: {
      dark: ['#0c4a6e', '#0284c7', '#0ea5e9'],
      light: ['#e0f2fe', '#7dd3fc', '#bae6fd'],
    },
    theme: {
      background: {
        type: 'gradient',
        value: 'linear-gradient(160deg, #0c4a6e 0%, #0369a1 45%, #0ea5e9 100%)',
        blur: 0, overlay: 0.15, overlayColor: '#020617',
      },
      backgroundLight: {
        type: 'gradient',
        value: 'linear-gradient(160deg, #e0f2fe 0%, #7dd3fc 50%, #bae6fd 100%)',
        blur: 0, overlay: 0, overlayColor: '#ffffff',
      },
      cardStyle: 'glass',
      accentColor: '#38bdf8',
      fontFamily: 'Source Sans 3',
      colorMode: 'auto',
      tokens: {
        dark: mt({
          bg: '#0c4a6e', bgElev: '#0e7490',
          surface: 'rgba(255, 255, 255, 0.08)', surfaceHover: 'rgba(255, 255, 255, 0.12)', surfaceStrong: '#155e75',
          text: '#e0f2fe', textMuted: '#bae6fd', textSubtle: '#7dd3fc', textFaint: '#38bdf8',
          border: 'rgba(186, 230, 253, 0.15)', borderStrong: 'rgba(186, 230, 253, 0.25)',
          accent: '#38bdf8', accentMuted: 'rgba(56, 189, 248, 0.18)', accentFg: '#0c4a6e',
        }),
        light: mt({
          bg: '#e0f2fe', bgElev: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.90)', surfaceHover: 'rgba(12, 74, 110, 0.05)', surfaceStrong: '#ffffff',
          text: '#0c4a6e', textMuted: '#075985', textSubtle: '#0369a1', textFaint: '#0284c7',
          border: 'rgba(12, 74, 110, 0.12)', borderStrong: 'rgba(12, 74, 110, 0.20)',
          accent: '#0284c7', accentMuted: 'rgba(2, 132, 199, 0.12)', accentFg: '#ffffff',
        }),
      },
    },
  },
  {
    id: 'forest',
    nameKey: 'admin.theme.preset.forest.name',
    descriptionKey: 'admin.theme.preset.forest.desc',
    thumbnail: 'gradient',
    previewColors: {
      dark: ['#052e16', '#166534', '#14532d'],
      light: ['#ecfdf5', '#bbf7d0', '#86efac'],
    },
    theme: {
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #052e16 0%, #166534 50%, #14532d 100%)',
        blur: 0, overlay: 0.1, overlayColor: '#000000',
      },
      backgroundLight: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #ecfdf5 0%, #bbf7d0 50%, #86efac 100%)',
        blur: 0, overlay: 0, overlayColor: '#ffffff',
      },
      cardStyle: 'glass',
      accentColor: '#4ade80',
      fontFamily: 'Nunito',
      colorMode: 'auto',
      tokens: {
        dark: mt({
          bg: '#052e16', bgElev: '#14532d',
          surface: 'rgba(255, 255, 255, 0.06)', surfaceHover: 'rgba(255, 255, 255, 0.10)', surfaceStrong: '#166534',
          text: '#ecfdf5', textMuted: '#bbf7d0', textSubtle: '#86efac', textFaint: '#4ade80',
          border: 'rgba(187, 247, 208, 0.12)', borderStrong: 'rgba(187, 247, 208, 0.22)',
          accent: '#4ade80', accentMuted: 'rgba(74, 222, 128, 0.15)', accentFg: '#052e16',
        }),
        light: mt({
          bg: '#ecfdf5', bgElev: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.92)', surfaceHover: 'rgba(20, 83, 45, 0.04)', surfaceStrong: '#ffffff',
          text: '#14532d', textMuted: '#166534', textSubtle: '#15803d', textFaint: '#16a34a',
          border: 'rgba(20, 83, 45, 0.12)', borderStrong: 'rgba(20, 83, 45, 0.20)',
          accent: '#16a34a', accentMuted: 'rgba(22, 163, 74, 0.12)', accentFg: '#ffffff',
        }),
      },
    },
  },
  {
    id: 'sunset',
    nameKey: 'admin.theme.preset.sunset.name',
    descriptionKey: 'admin.theme.preset.sunset.desc',
    thumbnail: 'gradient',
    previewColors: {
      dark: ['#431407', '#c2410c', '#fb923c'],
      light: ['#fff7ed', '#fed7aa', '#fdba74'],
    },
    theme: {
      background: {
        type: 'gradient',
        value: 'linear-gradient(145deg, #431407 0%, #c2410c 55%, #fb923c 100%)',
        blur: 0, overlay: 0.2, overlayColor: '#1c1917',
      },
      backgroundLight: {
        type: 'gradient',
        value: 'linear-gradient(145deg, #fff7ed 0%, #fed7aa 55%, #fdba74 100%)',
        blur: 0, overlay: 0, overlayColor: '#ffffff',
      },
      cardStyle: 'glass',
      accentColor: '#fb923c',
      fontFamily: 'Poppins',
      colorMode: 'auto',
      tokens: {
        dark: mt({
          bg: '#431407', bgElev: '#7c2d12',
          surface: 'rgba(255, 255, 255, 0.08)', surfaceHover: 'rgba(255, 255, 255, 0.12)', surfaceStrong: '#9a3412',
          text: '#fff7ed', textMuted: '#fed7aa', textSubtle: '#fdba74', textFaint: '#fb923c',
          border: 'rgba(254, 215, 170, 0.15)', borderStrong: 'rgba(254, 215, 170, 0.25)',
          accent: '#fb923c', accentMuted: 'rgba(251, 146, 60, 0.18)', accentFg: '#431407',
        }),
        light: mt({
          bg: '#fff7ed', bgElev: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.92)', surfaceHover: 'rgba(67, 20, 7, 0.04)', surfaceStrong: '#ffffff',
          text: '#431407', textMuted: '#7c2d12', textSubtle: '#9a3412', textFaint: '#c2410c',
          border: 'rgba(67, 20, 7, 0.12)', borderStrong: 'rgba(67, 20, 7, 0.20)',
          accent: '#ea580c', accentMuted: 'rgba(234, 88, 12, 0.12)', accentFg: '#ffffff',
        }),
      },
    },
  },
  {
    id: 'corporate-light',
    nameKey: 'admin.theme.preset.corporateLight.name',
    descriptionKey: 'admin.theme.preset.corporateLight.desc',
    thumbnail: 'solid',
    previewColors: {
      dark: ['#0f172a', '#1e293b', '#3b82f6'],
      light: ['#f8fafc', '#e2e8f0', '#cbd5e1'],
    },
    theme: {
      background: {
        type: 'color', value: '#1e293b',
        blur: 0, overlay: 0, overlayColor: '#000000',
      },
      backgroundLight: {
        type: 'color', value: '#f1f5f9',
        blur: 0, overlay: 0, overlayColor: '#000000',
      },
      cardStyle: 'flat',
      accentColor: '#3b82f6',
      fontFamily: 'Roboto',
      colorMode: 'auto',
      tokens: {
        dark: mt({
          bg: '#1e293b', bgElev: '#334155',
          surface: 'rgba(255, 255, 255, 0.06)', surfaceHover: 'rgba(255, 255, 255, 0.10)', surfaceStrong: '#334155',
          text: '#f1f5f9', textMuted: '#cbd5e1', textSubtle: '#94a3b8', textFaint: '#64748b',
          border: 'rgba(255, 255, 255, 0.10)', borderStrong: 'rgba(255, 255, 255, 0.18)',
          accent: '#3b82f6', accentMuted: 'rgba(59, 130, 246, 0.15)', accentFg: '#ffffff',
        }),
        light: mt({
          bg: '#f1f5f9', bgElev: '#ffffff',
          surface: '#ffffff', surfaceHover: 'rgba(15, 23, 42, 0.04)', surfaceStrong: '#ffffff',
          text: '#0f172a', textMuted: '#334155', textSubtle: '#475569', textFaint: '#64748b',
          border: 'rgba(15, 23, 42, 0.10)', borderStrong: 'rgba(15, 23, 42, 0.18)',
          accent: '#2563eb', accentMuted: 'rgba(37, 99, 235, 0.10)', accentFg: '#ffffff',
        }),
      },
    },
  },
  {
    id: 'terminal',
    nameKey: 'admin.theme.preset.terminal.name',
    descriptionKey: 'admin.theme.preset.terminal.desc',
    thumbnail: 'solid',
    previewColors: {
      dark: ['#0a0a0a', '#14532d', '#22c55e'],
      light: ['#f4f4f5', '#dcfce7', '#16a34a'],
    },
    theme: {
      background: {
        type: 'color', value: '#0a0a0a',
        blur: 0, overlay: 0, overlayColor: '#000000',
      },
      backgroundLight: {
        type: 'color', value: '#f4f4f5',
        blur: 0, overlay: 0, overlayColor: '#ffffff',
      },
      cardStyle: 'outlined',
      accentColor: '#22c55e',
      fontFamily: 'system-ui',
      colorMode: 'auto',
      tokens: {
        dark: mt({
          bg: '#0a0a0a', bgElev: '#171717',
          surface: 'rgba(34, 197, 94, 0.04)', surfaceHover: 'rgba(34, 197, 94, 0.08)', surfaceStrong: '#171717',
          text: '#bbf7d0', textMuted: '#86efac', textSubtle: '#4ade80', textFaint: '#22c55e',
          border: 'rgba(34, 197, 94, 0.20)', borderStrong: 'rgba(34, 197, 94, 0.35)',
          accent: '#22c55e', accentMuted: 'rgba(34, 197, 94, 0.15)', accentFg: '#0a0a0a',
        }),
        light: mt({
          bg: '#f4f4f5', bgElev: '#ffffff',
          surface: '#ffffff', surfaceHover: 'rgba(20, 83, 45, 0.04)', surfaceStrong: '#ffffff',
          text: '#14532d', textMuted: '#166534', textSubtle: '#15803d', textFaint: '#16a34a',
          border: 'rgba(20, 83, 45, 0.15)', borderStrong: 'rgba(20, 83, 45, 0.25)',
          accent: '#16a34a', accentMuted: 'rgba(22, 163, 74, 0.10)', accentFg: '#ffffff',
        }),
      },
    },
  },
  {
    id: 'glass-aurora',
    nameKey: 'admin.theme.preset.glassAurora.name',
    descriptionKey: 'admin.theme.preset.glassAurora.desc',
    thumbnail: 'gradient',
    previewColors: {
      dark: ['#1e1b4b', '#7c3aed', '#ec4899'],
      light: ['#faf5ff', '#f3e8ff', '#fce7f3'],
    },
    theme: {
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #1e1b4b 0%, #6d28d9 40%, #db2777 100%)',
        blur: 4, overlay: 0.25, overlayColor: '#0f172a',
      },
      backgroundLight: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 45%, #fce7f3 100%)',
        blur: 2, overlay: 0, overlayColor: '#ffffff',
      },
      cardStyle: 'glass',
      accentColor: '#c084fc',
      fontFamily: 'Montserrat',
      colorMode: 'auto',
      tokens: {
        dark: mt({
          bg: '#1e1b4b', bgElev: '#312e81',
          surface: 'rgba(255, 255, 255, 0.08)', surfaceHover: 'rgba(255, 255, 255, 0.12)', surfaceStrong: '#4c1d95',
          text: '#f5f3ff', textMuted: '#e9d5ff', textSubtle: '#d8b4fe', textFaint: '#c084fc',
          border: 'rgba(216, 180, 254, 0.15)', borderStrong: 'rgba(216, 180, 254, 0.25)',
          accent: '#c084fc', accentMuted: 'rgba(192, 132, 252, 0.18)', accentFg: '#1e1b4b',
        }),
        light: mt({
          bg: '#faf5ff', bgElev: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.90)', surfaceHover: 'rgba(88, 28, 135, 0.04)', surfaceStrong: '#ffffff',
          text: '#581c87', textMuted: '#6b21a8', textSubtle: '#7e22ce', textFaint: '#9333ea',
          border: 'rgba(88, 28, 135, 0.12)', borderStrong: 'rgba(88, 28, 135, 0.20)',
          accent: '#9333ea', accentMuted: 'rgba(147, 51, 234, 0.12)', accentFg: '#ffffff',
        }),
      },
    },
  },
  {
    id: 'minimal-mono',
    nameKey: 'admin.theme.preset.minimalMono.name',
    descriptionKey: 'admin.theme.preset.minimalMono.desc',
    thumbnail: 'solid',
    previewColors: {
      dark: ['#18181b', '#27272a', '#71717a'],
      light: ['#fafafa', '#e4e4e7', '#a1a1aa'],
    },
    theme: {
      background: {
        type: 'color', value: '#18181b',
        blur: 0, overlay: 0, overlayColor: '#000000',
      },
      backgroundLight: {
        type: 'color', value: '#fafafa',
        blur: 0, overlay: 0, overlayColor: '#ffffff',
      },
      cardStyle: 'outlined',
      accentColor: '#a1a1aa',
      fontFamily: 'Inter',
      colorMode: 'auto',
      tokens: {
        dark: mt({
          bg: '#18181b', bgElev: '#27272a',
          surface: 'rgba(255, 255, 255, 0.04)', surfaceHover: 'rgba(255, 255, 255, 0.08)', surfaceStrong: '#27272a',
          text: '#fafafa', textMuted: '#d4d4d8', textSubtle: '#a1a1aa', textFaint: '#71717a',
          border: 'rgba(255, 255, 255, 0.10)', borderStrong: 'rgba(255, 255, 255, 0.18)',
          accent: '#a1a1aa', accentMuted: 'rgba(161, 161, 170, 0.15)', accentFg: '#18181b',
        }),
        light: mt({
          bg: '#fafafa', bgElev: '#ffffff',
          surface: '#ffffff', surfaceHover: 'rgba(24, 24, 27, 0.04)', surfaceStrong: '#ffffff',
          text: '#18181b', textMuted: '#3f3f46', textSubtle: '#52525b', textFaint: '#71717a',
          border: 'rgba(24, 24, 27, 0.12)', borderStrong: 'rgba(24, 24, 27, 0.20)',
          accent: '#52525b', accentMuted: 'rgba(82, 82, 91, 0.10)', accentFg: '#ffffff',
        }),
      },
    },
  },
];

export function getBuiltinPreset(id: string): ThemePreset | undefined {
  return BUILTIN_THEME_PRESETS.find((p) => p.id === id);
}

export function getPresetVariant(preset: ThemePreset, mode: PresetColorMode): ThemePresetVariant {
  return {
    previewColors: preset.previewColors[mode],
    theme: preset.theme,
  };
}

export function applyThemePreset(base: Theme, preset: ThemePreset, mode: PresetColorMode): Theme {
  const merged = mergeThemePartial(base, preset.theme);
  merged.colorMode = mode;
  return merged;
}

/** Merge a partial theme snapshot (custom presets, imports). */
export function applyThemePresetPartial(base: Theme, partial: Partial<Theme>): Theme {
  return mergeThemePartial(base, partial);
}

export interface CustomThemePresetListItem {
  id: string;
  nameKey: string;
  descriptionKey: string;
  thumbnail: 'gradient';
  custom: true;
  theme: Partial<Theme>;
}

export function getAllPresets(customPresets: Theme['customPresets'] = []): Array<ThemePreset | CustomThemePresetListItem> {
  const custom: CustomThemePresetListItem[] = customPresets.map((cp) => ({
    id: cp.id,
    nameKey: cp.name,
    descriptionKey: cp.name,
    thumbnail: 'gradient' as const,
    custom: true as const,
    theme: cp.theme,
  }));
  return [...BUILTIN_THEME_PRESETS, ...custom];
}
