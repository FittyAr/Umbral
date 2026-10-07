import { errMsg, type AdminFragment } from "./types";
import type { AIProvider } from "~/pages/admin/ai-providers";

/**
 * Fragmento del objeto Alpine del admin: dominio ai.
 *
 * Se compone con spread en `dashboard.astro`, así que los métodos siguen
 * resolviendo `this` contra el objeto completo.
 */
export function createAiState(): AdminFragment {
  return {
    aiBusy: false,
    aiTestResult: '',
    aiTestOk: false,
    // AI provider presets (cargados desde src/pages/admin/ai-providers.ts).
    // Sirven para auto-rellenar baseUrl y model cuando elegís un provider
    // popular (OpenAI, Anthropic, Gemini, etc.). No bloquean — podés editar
    // los valores después y la UI detecta automáticamente si matchean un preset.
    // Todo esto llega de /api/ai-meta.json al abrir el tab IA: es un tab
    // opt-in y son 12 KB que la mayoría de las sesiones no abre.
    aiProviders: [],
    aiPreset: '',
    // Idiomas disponibles para el system prompt default de la IA. La
    // lista de códigos matchea exactamente con cfg.ai.language.
    aiLanguages: [],
    // Map de prompts default por idioma. Se usa para mostrar el preview
    // y para "Usar este prompt" según el idioma actual.
    defaultSystemPrompts: {},
    defaultSystemPrompt: '',
    _aiMetaPromise: null,

    ensureAiMeta() {
      if (this.aiProviders.length > 0) return Promise.resolve();
      if (!this._aiMetaPromise) {
        this._aiMetaPromise = window.umbralAdmin
          .api('GET', '/api/ai-meta.json')
          .then((res: { providers?: AIProvider[]; languages?: unknown[]; defaultSystemPrompts?: Record<string, string>; defaultSystemPrompt?: string }) => {
            this.aiProviders = res.providers || [];
            this.aiLanguages = res.languages || [];
            this.defaultSystemPrompts = res.defaultSystemPrompts || {};
            this.defaultSystemPrompt = res.defaultSystemPrompt || '';
          })
          .catch(() => {
            this._aiMetaPromise = null;
          });
      }
      return this._aiMetaPromise;
    },
    // ── AI provider presets ──────────────────────────────────────
    // Cuando el user elige un preset, rellenamos baseUrl y model con los
    // valores oficiales. Si después edita baseUrl a mano, el preset se
    // "deselecciona" automáticamente (presetId() devuelve '' porque ya
    // no matchea). Así el preset es sugerencia, no lock.
    applyAiPreset(presetId: string) {
      const p = this.aiProviders.find((x: AIProvider) => x.id === presetId);
      if (!p) return;
      this.cfg.ai.baseUrl = p.baseUrl;
      this.cfg.ai.model = p.defaultModel;
      this.markDirty();
    },
    // Devuelve el ID del preset que matchea el baseUrl actual, o '' si es custom.
    currentPresetId() {
      const bu = (this.cfg.ai?.baseUrl || '').replace(/\/+$/, '').toLowerCase();
      if (!bu) return '';
      const p = this.aiProviders.find((x: AIProvider) => x.baseUrl.replace(/\/+$/, '').toLowerCase() === bu);
      return p?.id || '';
    },
    presetDescription() {
      const id = this.aiPreset || this.currentPresetId();
      const p = this.aiProviders.find((x: AIProvider) => x.id === id);
      return p?.description || 'Custom: cualquier endpoint /v1/chat/completions';
    },
    presetRegion() {
      const id = this.aiPreset || this.currentPresetId();
      const p = this.aiProviders.find((x: AIProvider) => x.id === id);
      return p?.region || '';
    },
    presetApiKeyLabel() {
      const id = this.aiPreset || this.currentPresetId();
      const p = this.aiProviders.find((x: AIProvider) => x.id === id);
      return p?.apiKeyLabel || 'API Key';
    },
    presetApiKeyHelp() {
      const id = this.aiPreset || this.currentPresetId();
      const p = this.aiProviders.find((x: AIProvider) => x.id === id);
      return p?.apiKeyHelp || 'Tu clave del provider. Se guarda en data/config.json en texto plano (ver ayuda en el ícono ?).';
    },
    presetModels() {
      const id = this.aiPreset || this.currentPresetId();
      const p = this.aiProviders.find((x: AIProvider) => x.id === id);
      return p?.models || [];
    },
    useDefaultSystemPrompt() {
      // Carga el prompt default del idioma actual (no el español).
      this.cfg.ai.systemPrompt = this.currentDefaultSystemPrompt();
      this.markDirty();
    },
    // El preview que se muestra debajo del textarea. Si el user
    // cambió el idioma, este getter devuelve el prompt en el nuevo
    // idioma, así el preview matchea.
    currentDefaultSystemPrompt() {
      const lang = (this.cfg.ai && this.cfg.ai.language) || 'es';
      return this.defaultSystemPrompts[lang] || this.defaultSystemPrompts.es || this.defaultSystemPrompt;
    },

    async testAI() {
      this.aiTestResult = '';
      this.aiTestOk = false;
      if (!this.cfg.ai?.enabled) {
        this.aiTestResult = '✗ Activá el switch "Habilitar asistente IA" arriba primero.';
        return;
      }
      if (!this.cfg.ai?.baseUrl) {
        this.aiTestResult = '✗ Falta Base URL. Elegí un preset o tipeá la URL del provider.';
        return;
      }
      if (!this.cfg.ai?.model) {
        this.aiTestResult = '✗ Falta Modelo. Elegí un preset (que autocompleta) o tipeá el nombre del modelo.';
        return;
      }
      this.aiBusy = true;
      try {
        // El server lee su propia config (la persistida). Si hay cambios sin
        // guardar, se guardan primero; si el guardado falla se aborta (antes
        // el error se tragaba y el test recargaba el config del server,
        // descartando lo que el admin había tipeado).
        if (this.dirty) {
          await this.saveAll();
          if (this.dirty) {
            this.aiTestResult = '✗ No se pudo guardar la configuración antes de probar.';
            return;
          }
        }
        const data = await window.umbralAdmin.api('POST', '/api/ai/format-card', {
          title: 'GitHub',
          description: 'Plataforma de código',
          url: 'https://github.com',
        });
        this.aiTestOk = true;
        this.aiTestResult = `✓ Conectado. Respuesta: "${data.title}" / "${data.description}"`;
      } catch (err: unknown) {
        this.aiTestResult = `✗ ${errMsg(err)}`;
      } finally {
        this.aiBusy = false;
      }
    },

    async improveWithAI() {
      if (!this.editingCard?.title) return;
      this.aiBusy = true;
      try {
        // Por umbralAdmin.api: manda el CSRF (sin él, el middleware respondía
        // 403) y respeta el subpath del deploy.
        const data = await window.umbralAdmin.api('POST', '/api/ai/format-card', {
          title: this.editingCard.title,
          description: this.editingCard.description,
          url: this.editingCard.url,
        });
        if (data.title) this.editingCard.title = data.title;
        if (data.description !== undefined) this.editingCard.description = data.description;
        window.umbralAdmin.toast('Mejorado con IA. Revisá antes de guardar.', 'success');
      } catch (err: unknown) {
        window.umbralAdmin.toast(`Error: ${errMsg(err)}`, 'error');
      } finally {
        this.aiBusy = false;
      }
    },
  };
}
