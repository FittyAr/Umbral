import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

import LayoutGrid from '../src/components/admin/layout/LayoutGrid.astro';
import ThemeColors from '../src/components/admin/theme/ThemeColors.astro';
import HelpIcon from '../src/components/admin/ui/HelpIcon.astro';
import FormGroup from '../src/components/admin/ui/FormGroup.astro';
import RangeField from '../src/components/admin/ui/RangeField.astro';
import ToggleField from '../src/components/admin/ui/ToggleField.astro';
import SelectField from '../src/components/admin/ui/SelectField.astro';
import ColorField from '../src/components/admin/ui/ColorField.astro';
import Modal from '../src/components/admin/ui/Modal.astro';
import EmptyState from '../src/components/admin/ui/EmptyState.astro';
import TabBar from '../src/components/admin/ui/TabBar.astro';
import Badge from '../src/components/admin/ui/Badge.astro';

/** Marca las claves para distinguir la capa i18n del fallback del servidor. */
const tr = (key: string) => `TR(${key})`;
const i18n = { useI18n: true, tr };
const noI18n = { useI18n: false, tr };

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = (component: unknown, options: Record<string, unknown>) =>
  container.renderToString(component as never, options as never);

describe('HelpIcon', () => {
  it('emite el handler de Alpine sin escapar las comillas simples', async () => {
    const html = await render(HelpIcon, { props: { helpKey: 'theme.accentColor' } });

    // Si Astro escapara las comillas, Alpine seguiría funcionando pero el HTML
    // dejaría de ser comparable con el que escribíamos a mano.
    expect(html).toContain(`@click="showHelp('theme.accentColor')"`);
    expect(html).toContain(':title="helpTooltipLabel()"');
    expect(html).toContain('class="help-icon"');
    expect(html).toContain('type="button"');
  });
});

describe('FormGroup', () => {
  it('renderiza el fallback del servidor y el x-text de cliente a la vez', async () => {
    const html = await render(FormGroup, {
      props: {
        ...noI18n,
        labelKey: 'admin.theme.colors.accent',
        labelFallback: 'Color de acento',
        labelExpr: 'themeAccentLabel()',
      },
    });

    expect(html).toContain('<span x-text="themeAccentLabel()">Color de acento</span>');
  });

  it('usa la traduccion cuando useI18n esta prendido', async () => {
    const html = await render(FormGroup, {
      props: {
        ...i18n,
        labelKey: 'admin.theme.colors.accent',
        labelFallback: 'Color de acento',
      },
    });

    expect(html).toContain('TR(admin.theme.colors.accent)');
    expect(html).not.toContain('Color de acento');
  });

  it('omite x-show, el valor y la ayuda cuando no se piden', async () => {
    const html = await render(FormGroup, { props: { ...noI18n, labelFallback: 'X' } });

    expect(html).not.toContain('x-show');
    expect(html).not.toContain('help-icon');
    expect(html).not.toContain('(<span');
  });

  it('agrega x-show, el valor entre parentesis y la ayuda cuando se piden', async () => {
    const html = await render(FormGroup, {
      props: {
        ...noI18n,
        labelFallback: 'X',
        show: "cfg.theme.iconTint==='custom'",
        valueExpr: 'cfg.theme.headerOpacity',
        helpKey: 'theme.headerOpacity',
      },
    });

    expect(html).toContain(`x-show="cfg.theme.iconTint==='custom'"`);
    expect(html).toContain('(<span x-text="cfg.theme.headerOpacity"></span>)');
    expect(html).toContain(`showHelp('theme.headerOpacity')`);
  });

  it('coloca el control del slot despues del label', async () => {
    const html = await render(FormGroup, {
      props: { ...noI18n, labelFallback: 'X' },
      slots: { default: '<input id="probe" />' },
    });

    expect(html.indexOf('</label>')).toBeLessThan(html.indexOf('id="probe"'));
  });
});

describe('RangeField', () => {
  it('muestra el valor del modelo en el label sin pedir valueExpr', async () => {
    const html = await render(RangeField, {
      props: { ...noI18n, model: 'cfg.theme.headerOpacity', min: 0, max: 1, step: 0.05, labelFallback: 'Opacidad' },
    });

    expect(html).toContain('(<span x-text="cfg.theme.headerOpacity"></span>)');
    expect(html).toContain('type="range"');
    expect(html).toContain('x-model.number="cfg.theme.headerOpacity"');
    expect(html).not.toContain('type="number"');
  });

  it('con withNumber agrega el input numerico en layout-range-row', async () => {
    const html = await render(RangeField, {
      props: { ...noI18n, model: 'cfg.layout.columnsDesktop', min: 1, max: 8, labelFallback: 'Columnas', withNumber: true },
    });

    expect(html).toContain('class="layout-range-row"');
    expect(html).toContain('type="range"');
    expect(html).toContain('type="number"');
    expect(html.match(/x-model\.number="cfg\.layout\.columnsDesktop"/g)).toHaveLength(2);
  });
});

describe('ToggleField', () => {
  it('pone el checkbox dentro del label, antes del texto', async () => {
    const html = await render(ToggleField, {
      props: {
        ...noI18n,
        model: 'cfg.theme.showClock',
        labelFallback: 'Mostrar reloj',
        labelExpr: 'themeShowClockLabel()',
        helpKey: 'theme.showClock',
      },
    });

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('x-model="cfg.theme.showClock"');
    expect(html.indexOf('type="checkbox"')).toBeLessThan(html.indexOf('themeShowClockLabel()'));
    expect(html.indexOf('themeShowClockLabel()')).toBeLessThan(html.indexOf('help-icon'));
  });
});

describe('SelectField', () => {
  const options = [
    { value: 'auto', key: 'admin.theme.colors.modeAuto', label: 'Auto' },
    { value: '24h', label: '24h' },
  ];

  it('traduce las opciones que tienen clave y deja las literales', async () => {
    const html = await render(SelectField, {
      props: { ...i18n, model: 'cfg.theme.colorMode', options, labelFallback: 'Modo' },
    });

    expect(html).toContain('<option value="auto">TR(admin.theme.colors.modeAuto)</option>');
    expect(html).toContain('<option value="24h">24h</option>');
  });

  it('bindea sin .number por defecto y con .number cuando es numerico', async () => {
    const plain = await render(SelectField, {
      props: { ...noI18n, model: 'cfg.theme.colorMode', options, labelFallback: 'Modo' },
    });
    const numeric = await render(SelectField, {
      props: { ...noI18n, model: 'cfg.layout.columnsDesktop', options, labelFallback: 'Columnas', numeric: true },
    });

    expect(plain).toContain('x-model="cfg.theme.colorMode"');
    expect(plain).not.toContain('x-model.number');
    expect(numeric).toContain('x-model.number="cfg.layout.columnsDesktop"');
    expect(numeric).not.toContain('x-model="cfg.layout.columnsDesktop"');
  });
});

describe('ColorField', () => {
  it('bindea el swatch y el hex al mismo modelo', async () => {
    const html = await render(ColorField, {
      props: { ...noI18n, model: 'cfg.theme.accentColor', labelFallback: 'Acento' },
    });

    expect(html).toContain('class="theme-color-field"');
    expect(html.match(/x-model="cfg\.theme\.accentColor"/g)).toHaveLength(2);
  });

  it('en modo token usa los accessors por modo claro/oscuro', async () => {
    const html = await render(ColorField, {
      props: { ...noI18n, token: 'icon', labelFallback: 'Icono', placeholder: '#60a5fa' },
    });

    expect(html).toContain(`:value="getModeToken('icon')"`);
    expect(html).toContain(`@input="setModeToken('icon', $event.target.value)"`);
    expect(html).toContain('placeholder="#60a5fa"');
    expect(html).not.toContain('x-model');
  });

  it('falla si no recibe exactamente uno de model o token', async () => {
    await expect(render(ColorField, { props: { ...noI18n } })).rejects.toThrow(/model.*token/);
    await expect(
      render(ColorField, { props: { ...noI18n, model: 'a', token: 'icon' } }),
    ).rejects.toThrow(/model.*token/);
  });
});

describe('Modal', () => {
  it('envuelve en template x-if y cierra por backdrop y Escape', async () => {
    const html = await render(Modal, {
      props: { ...noI18n, show: 'showPresetsModal', close: 'showPresetsModal = false', titleFallback: 'Plantillas' },
    });

    expect(html).toContain('<template x-if="showPresetsModal">');
    expect(html).toContain('class="modal-backdrop"');
    expect(html).toContain('@click.self="showPresetsModal = false"');
    expect(html).toContain('@keydown.escape.window="showPresetsModal = false"');
    expect(html).toContain('Plantillas');
  });

  it('solo emite el pie cuando hay slot footer', async () => {
    const withoutFooter = await render(Modal, {
      props: { ...noI18n, show: 'a', close: 'a = false' },
    });
    const withFooter = await render(Modal, {
      props: { ...noI18n, show: 'a', close: 'a = false' },
      slots: { footer: '<button id="ok">Ok</button>' },
    });

    expect(withoutFooter).not.toContain('modal-footer');
    expect(withFooter).toContain('modal-footer');
    expect(withFooter).toContain('id="ok"');
  });

  it('acepta clase extra en el modal', async () => {
    const html = await render(Modal, {
      props: { ...noI18n, show: 'a', close: 'a = false', modalClass: 'modal--wide' },
    });

    expect(html).toContain('class="modal modal--wide"');
  });
});

describe('EmptyState', () => {
  it('renderiza el mensaje y respeta x-show', async () => {
    const html = await render(EmptyState, {
      props: { ...noI18n, messageFallback: 'Sin resultados', show: 'filtered.length === 0', fullWidth: true },
    });

    expect(html).toContain('Sin resultados');
    expect(html).toContain('x-show="filtered.length === 0"');
    expect(html).toContain('admin-empty-state--full');
  });
});

describe('TabBar', () => {
  const items = [
    { id: 'colors', key: 'admin.theme.section.colors', label: 'Colores' },
    { id: 'widgets', label: 'Widgets', show: 'features.widgets' },
  ];

  it('arma el :class de activo y el @click que asigna el estado', async () => {
    const html = await render(TabBar, {
      props: { ...noI18n, state: 'themeSection', items, variant: 'theme-nav' },
    });

    expect(html).toContain('class="theme-nav"');
    expect(html).toContain('class="theme-nav-btn"');
    // Astro escapa `&` en los valores de atributo, que es HTML valido y el
    // navegador se lo entrega a Alpine ya decodificado.
    expect(html).toContain(`:class="themeSection==='colors' &amp;&amp; 'active'"`);
    expect(html).toContain(`@click="themeSection = 'colors'"`);
    expect(html).toContain('x-show="features.widgets"');
  });

  it('la variante theme-advanced-tabs no le pone clase a los botones', async () => {
    const html = await render(TabBar, {
      props: {
        ...noI18n,
        state: 'themeTextEditMode',
        items: [{ id: 'dark', label: 'Dark' }],
        variant: 'theme-advanced-tabs',
      },
    });

    expect(html).toContain('class="theme-advanced-tabs"');
    expect(html).toContain('<button type="button"');
    expect(html).not.toContain('class="tab"');
  });

  it('permite reemplazar el click con onSelect', async () => {
    const html = await render(TabBar, {
      props: {
        ...noI18n,
        state: 'tab',
        items: [{ id: 'cards', label: 'Tarjetas' }],
        onSelect: "selectTab('$id')",
      },
    });

    expect(html).toContain(`@click="selectTab('cards')"`);
  });
});

describe('Badge', () => {
  it('combina clase estatica, :class dinamico y x-text', async () => {
    const html = await render(Badge, {
      props: {
        ...noI18n,
        textFallback: 'AA',
        textExpr: "themeContrastLabel('text')",
        classExpr: "themeContrastClass('text')",
        class: 'theme-contrast-badge',
      },
    });

    expect(html).toContain('class="admin-badge theme-contrast-badge"');
    expect(html).toContain(`:class="themeContrastClass('text')"`);
    expect(html).toContain(`x-text="themeContrastLabel('text')"`);
  });
});

/**
 * Los dos paneles migrados a los genéricos. Estas aserciones cubren lo que la
 * migración no debía cambiar: los paths del config, las claves de ayuda, los
 * rangos de cada slider y las dos capas de i18n.
 */
describe('LayoutGrid migrado a los genericos', () => {
  let html = '';

  beforeAll(async () => {
    html = await render(LayoutGrid, { props: noI18n });
  });

  it('mantiene los tabs de breakpoint con su handler propio', () => {
    expect(html).toContain('class="layout-breakpoint-tabs"');
    for (const bp of ['desktop', 'tablet', 'mobile']) {
      expect(html).toContain(`@click="setLayoutBreakpoint('${bp}')"`);
      expect(html).toContain(`:class="layoutBreakpoint==='${bp}' &amp;&amp; 'active'"`);
    }
    expect(html).toContain('x-text="layoutBreakpointDesktop()"');
  });

  it('mantiene los siete campos con su modelo y su clave de ayuda', () => {
    const fields: Array<[string, string]> = [
      ['cfg.layout.columnsDesktop', 'layout.columnsDesktop'],
      ['cfg.layout.columnsTablet', 'layout.columnsTablet'],
      ['cfg.layout.columnsMobile', 'layout.columnsMobile'],
      ['cfg.layout.gap', 'layout.gap'],
      ['cfg.layout.maxWidth', 'layout.maxWidth'],
      ['cfg.layout.categoryGap', 'layout.categoryGap'],
      ['cfg.layout.ghostCategoryGap', 'layout.ghostCategoryGap'],
    ];

    for (const [model, helpKey] of fields) {
      expect(html).toContain(`x-model.number="${model}"`);
      expect(html).toContain(`showHelp('${helpKey}')`);
    }
    expect(html).toContain('x-model="cfg.layout.gridAlign"');
    expect(html).toContain(`showHelp('layout.gridAlign')`);
  });

  it('mantiene los rangos distintos por breakpoint', () => {
    expect(html).toContain('min="2" max="8"');
    expect(html).toContain('min="2" max="6"');
    expect(html).toContain('min="1" max="3"');
    expect(html).toContain('min="720" max="2560" step="40"');
  });

  it('mantiene el valor formateado con su unidad', () => {
    expect(html).toContain('(<span x-text="(cfg.layout.gap ?? 1).toFixed(1)"></span>rem)');
    expect(html).toContain('(<span x-text="cfg.layout.maxWidth"></span>px)');
    expect(html).toContain('(<span x-text="(cfg.layout.ghostCategoryGap ?? 0.35).toFixed(2)"></span>rem)');
  });

  it('sigue emitiendo cada slider con su input numerico', () => {
    expect(html.match(/class="layout-range-row"/g)).toHaveLength(7);
    expect(html.match(/class="layout-num-input"/g)).toHaveLength(7);
  });
});

describe('ThemeColors migrado a los genericos', () => {
  let html = '';

  beforeAll(async () => {
    html = await render(ThemeColors, { props: noI18n });
  });

  it('mantiene todas las claves de ayuda de la seccion', () => {
    for (const key of [
      'theme.accentColor',
      'theme.iconTint',
      'theme.iconColor',
      'theme.colorMode',
      'theme.autoStrategy',
      'theme.textColor',
      'theme.derivedPalette',
    ]) {
      expect(html).toContain(`showHelp('${key}')`);
    }
  });

  it('mantiene los selects con todas sus opciones', () => {
    for (const value of ['original', 'accent', 'text', 'custom']) {
      expect(html).toContain(`<option value="${value}">`);
    }
    for (const value of ['auto', 'dark', 'light', 'system', 'schedule']) {
      expect(html).toContain(`<option value="${value}">`);
    }
  });

  it('esconde el color de icono custom y la estrategia auto igual que antes', () => {
    expect(html).toContain(`x-show="cfg.theme.iconTint==='custom'"`);
    expect(html).toContain(`x-show="cfg.theme.colorMode==='auto'"`);
  });

  it('conserva la rampa de tokens por modo', () => {
    expect(html).toContain(`x-for="key in ['text','textMuted','textSubtle','textFaint']"`);
    expect(html).toContain('theme-contrast-badge');
    expect(html.match(/class="theme-advanced-tabs"/g)).toHaveLength(2);
  });
});
