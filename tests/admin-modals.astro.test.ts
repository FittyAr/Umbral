import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

import CardEditorFields from '../src/components/admin/modals/CardEditorFields.astro';
import CardEditorModal from '../src/components/admin/modals/CardEditorModal.astro';
import HelpModal from '../src/components/admin/modals/HelpModal.astro';
import IconPickerPanel from '../src/components/admin/modals/IconPickerPanel.astro';
import PresetsModal from '../src/components/admin/modals/PresetsModal.astro';
import TokenCreatedModal from '../src/components/admin/modals/TokenCreatedModal.astro';
import TotpSetupModal from '../src/components/admin/modals/TotpSetupModal.astro';

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = (component: unknown) =>
  container.renderToString(component as never, {
    props: { useI18n: false, tr: (key: string) => key },
  } as never);

/**
 * Todo modal del admin se abre con `template x-if` y se cierra por click en el
 * backdrop y con Escape. Si un modal pierde una de las dos cosas queda
 * atrapando al usuario, así que se chequea para los cinco.
 */
describe('modales del admin', () => {
  const MODALS: Array<{ name: string; component: unknown; show: string; close: string }> = [
    { name: 'CardEditorModal', component: CardEditorModal, show: 'editingCard !== null', close: 'tryCancelEdit()' },
    { name: 'HelpModal', component: HelpModal, show: 'helpModalKey !== null', close: 'closeHelp()' },
    { name: 'PresetsModal', component: PresetsModal, show: 'showPresetsModal', close: 'showPresetsModal = false' },
    { name: 'TotpSetupModal', component: TotpSetupModal, show: 'showTotpSetupModal', close: 'showTotpSetupModal = false' },
    { name: 'TokenCreatedModal', component: TokenCreatedModal, show: 'showTokenModal', close: 'showTokenModal = false' },
  ];

  for (const modal of MODALS) {
    it(`${modal.name} se abre con x-if y se cierra por backdrop y Escape`, async () => {
      const html = await render(modal.component);

      expect(html).toContain('<template x-if=');
      expect(html).toContain(modal.show);
      expect(html).toContain('class="modal-backdrop"');
      expect(html).toContain(`@click.self="${modal.close}"`);
      expect(html).toContain(`@keydown.escape.window="${modal.close}"`);
    });
  }
});

describe('editor de tarjetas partido en dos columnas', () => {
  it('el modal compone las dos columnas y deja el form y el pie', async () => {
    const html = await render(CardEditorModal);

    expect(html).toContain('class="card-editor-layout"');
    expect(html).toContain('class="card-editor-fields"');
    expect(html).toContain('class="icon-picker-panel"');
    expect(html).toContain('@submit.prevent="saveCard()"');
    expect(html).toContain('class="card-editor-footer"');
  });

  it('la columna de campos trae los metadatos de la tarjeta', async () => {
    const html = await render(CardEditorFields);

    for (const model of [
      'editingCard.title',
      'editingCard.kind',
      'editingCard.url',
      'editingCard.category',
      'editingCard.pinned',
      'editingCard.healthCheck',
    ]) {
      expect(html).toContain(model);
    }
    expect(html).not.toContain('icon-picker-panel');
  });

  it('la columna del picker trae el preview, los tabs y el campo manual', async () => {
    const html = await render(IconPickerPanel);

    expect(html).toContain('class="icon-picker-preview"');
    expect(html).toContain(`iconPickerTab === 'icons'`);
    expect(html).toContain(`iconPickerTab === 'assets'`);
    expect(html).toContain('x-model="editingCard.icon"');
    expect(html).not.toContain('card-editor-fields');
  });
});

describe('modales migrados al Modal generico', () => {
  it('HelpModal saca titulo y cuerpo de Alpine y mantiene el boton de cierre', async () => {
    const html = await render(HelpModal);

    expect(html).toContain('class="modal help-modal"');
    expect(html).toContain('<h2 x-text="currentHelp().title">');
    expect(html).toContain('x-html="currentHelp().bodyHtml"');
    expect(html).toContain('class="modal-header"');
    expect(html).toContain('class="modal-footer"');
    expect(html).toContain('Entendido');
  });

  it('PresetsModal conserva filtros, grilla y estado vacio', async () => {
    const html = await render(PresetsModal);

    expect(html).toContain('x-model="presetFilter"');
    expect(html).toContain('presetCategoryFilter');
    expect(html).toContain('x-for="p in filteredAppPresets()"');
    expect(html).toContain('admin-empty-state--full');
    // El fix de los 404: sin icono instalado no se crea la imagen.
    expect(html).toContain('<template x-if="resolveIcon(p.icon)">');
  });
});
