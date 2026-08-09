// ──────────────────────────────────────────────────────────────────────────
// AI provider presets
//
// Cada preset trae la baseUrl y modelos oficiales del provider (o un default
// razonable si la doc no es específica). El user puede editar baseUrl y
// model después de elegir un preset — son sugerencias, no se bloquea nada.
//
// Fuentes (consultadas 2026-08-09):
// - OpenAI: developers.openai.com/api/docs/models — gpt-4o-mini default
// - xAI Grok: docs.x.ai/api/integrations — base https://api.x.ai/v1
// - Google Gemini: ai.google.dev/gemini-api/docs/openai — base con /v1beta/openai/
// - DeepSeek: api-docs.deepseek.com — base https://api.deepseek.com
// - Mistral: docs.mistral.ai/resources/migration-guides — base https://api.mistral.ai/v1
// - Qwen / DashScope: alibabacloud.com/help/en/model-studio — base /compatible-mode/v1
// - Kimi / Moonshot: platform.moonshot.cn/docs/api/overview — base https://api.moonshot.cn/v1
// - MiniMax: platform.MiniMax.io/docs/api-reference/text-openai-api — base https://api.MiniMax.io/v1
// - OpenRouter: openrouter.ai/docs/quickstart — base https://openrouter.ai/api/v1
// - Hugging Face: huggingface.co/changelog/inference-providers-openai-compatible
//   (legacy api-inference.huggingface.co está dead desde 2025-Q4)
// - GitHub Models: github.com/orgs/community/discussions/157126
//   (azure legacy + github.ai nuevo)
// - Anthropic: platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk
//   (soporte OpenAI-compatible oficial pero marcado como "no production-ready")
// ──────────────────────────────────────────────────────────────────────────

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: string[]; // modelos comunes; [] = "el provider lista los suyos, tipeá el nombre"
  description: string;
  apiKeyLabel: string;
  apiKeyHelp: string;
  region?: string; // nota sobre región si aplica
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-3.5-turbo', 'o3-mini', 'o4-mini'],
    description: 'GPT-4o y familia. Multi-modal, function calling, JSON mode estricto, 128k contexto.',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila en platform.openai.com/api-keys. Empieza con "sk-...".',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1/',
    defaultModel: 'claude-sonnet-4-5',
    models: ['claude-opus-4-1', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3-5-sonnet-latest'],
    description: 'Claude Opus / Sonnet / Haiku. Soporte OpenAI-compatible oficial pero Anthropic lo marca como "principalmente para test/comparación, no production-ready" — para producción usá su SDK nativo.',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila en console.anthropic.com. Empieza con "sk-ant-...".',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
    models: ['grok-4', 'grok-3', 'grok-3-mini', 'grok-2-latest', 'grok-2-mini', 'grok-2-vision-1212'],
    description: 'Grok 2/3/4. Búsqueda en X (Twitter) en tiempo real, contexto 128k-256k. Algunos modelos aceptan imagen.',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila en console.x.ai. Empieza con "xai-...".',
  },
  {
    id: 'google',
    name: 'Google AI Studio (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    description: 'Gemini 2.0 / 2.5. Tier gratis generoso (60 req/min en Flash), multi-modal nativo, contexto hasta 2M.',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila GRATIS en aistudio.google.com/apikey.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash', 'deepseek-v4-pro'],
    description: 'DeepSeek-V3 / R1 / V4. Muy barato (caching agresivo), fuerte en código y razonamiento. 1M contexto en V4.',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila en platform.deepseek.com. Primer crédito gratis al registrarte.',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'pixtral-large-latest'],
    description: 'Mistral Large / Medium / Small. Fuerte en europeo y código. Codestral es especializado en code completion.',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila en console.mistral.ai.',
  },
  {
    id: 'qwen',
    name: 'Alibaba Qwen (DashScope)',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen3-max', 'qwen-plus', 'qwen-flash', 'qwen-coder-plus', 'qwen-coder-flash', 'qwen-vl-plus'],
    description: 'Qwen 3 Max / Plus / Flash. Muy fuerte en chino, código y math. Region: international (aliyuncs.com sin el sufijo -intl es China continental).',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila en dashscope.console.aliyun.com. Para región China usá https://dashscope.aliyuncs.com/compatible-mode/v1.',
    region: 'Si tu tráfico es desde China continental usá https://dashscope.aliyuncs.com/compatible-mode/v1 (sin -intl).',
  },
  {
    id: 'kimi',
    name: 'Moonshot Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-k2-0711-preview'],
    description: 'Kimi K2 / Moonshot v1. Hasta 256k tokens de contexto. Bueno en chino y código largo.',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila en platform.moonshot.cn. Plataforma china — si necesitás acceso global usá https://api.moonshot.ai/v1.',
  },
  {
    id: 'minimax',
    name: 'MiniMax (M-series)',
    baseUrl: 'https://api.minimax.io/v1',
    defaultModel: 'MiniMax-M2.7',
    models: ['MiniMax-M3', 'MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'MiniMax-M2'],
    description: 'M2 / M2.5 / M2.7 / M3. Optimizado para agentic, tool use, coding y long-context. Variantes -highspeed son 100 tps.',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila en platform.MiniMax.io. Soporta thinking nativo — preservá los <think> tags en respuestas.',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    models: [], // OpenRouter lista 200+ modelos — el user tipea el que quiera
    description: '200+ modelos (OpenAI, Anthropic, Google, Meta, Mistral) en una sola API. Auto-routing, fallbacks, una sola factura.',
    apiKeyLabel: 'API Key',
    apiKeyHelp: 'Conseguila en openrouter.ai/keys. Modelo se escribe como "provider/model" (ej: "anthropic/claude-sonnet-4-5").',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face (Inference Providers)',
    baseUrl: 'https://router.huggingface.co/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct',
      'meta-llama/Llama-3.1-8B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
    ],
    description: 'Modelos open-source (Llama, Qwen, Mistral, Phi) servidos por varios providers (Together, Groq, Novita, etc.) detrás del router.',
    apiKeyLabel: 'HF Token',
    apiKeyHelp: 'Conseguila en huggingface.co/settings/tokens. Habilitá el scope "Make calls to Inference Providers" en el token.',
  },
  {
    id: 'github',
    name: 'GitHub Models',
    baseUrl: 'https://models.inference.ai.azure.com',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'meta-llama-3.1-405b-instruct', 'phi-3.5-mini-instruct'],
    description: 'Acceso a GPT-4o, Llama 3.1, Phi-3, etc. via tu cuenta de GitHub. El endpoint nuevo github.ai está rolling out, por ahora el estable es el Azure-hosted.',
    apiKeyLabel: 'GitHub PAT',
    apiKeyHelp: 'Conseguila en github.com/settings/tokens (fine-grained, scope: Models). También funciona el GITHUB_TOKEN de Codespaces/Actions.',
  },
  {
    id: 'ollama',
    name: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: [], // Ollama lista los modelos descargados con `ollama list`
    description: 'Modelos open-source corriendo en tu máquina. Sin API key, sin internet, sin costo por token. Descargá modelos con `ollama pull <modelo>`.',
    apiKeyLabel: '(no requiere)',
    apiKeyHelp: 'Ollama no valida la key. Dejá vacío o poné "ollama" para evitar errores.',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (local)',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'loaded-model',
    models: [],
    description: 'GUI desktop para correr modelos locales (GGUF). Iniciá el servidor local en LM Studio y activá "OpenAI-compatible API".',
    apiKeyLabel: '(no requiere)',
    apiKeyHelp: 'LM Studio no valida la key. Dejá vacío o poné "lm-studio". El modelo es el que cargaste en la GUI.',
  },
];

/** Buscar un preset por su baseUrl. Útil para auto-detectar cuando el user
 *  tiene una config vieja y queremos mostrarle qué preset coincide. */
export function findPresetByBaseUrl(baseUrl: string): AIProvider | undefined {
  const normalized = baseUrl.replace(/\/+$/, '').toLowerCase();
  return AI_PROVIDERS.find((p) => p.baseUrl.replace(/\/+$/, '').toLowerCase() === normalized);
}

// ──────────────────────────────────────────────────────────────────────────
// Default system prompt
//
// El que usa /api/ai/format-card cuando cfg.ai.systemPrompt está vacío.
// Lo exportamos para que el admin pueda mostrarlo en preview read-only.
// ──────────────────────────────────────────────────────────────────────────
export const DEFAULT_AI_SYSTEM_PROMPT = `Sos un asistente que ayuda a redactar tarjetas para un portal interno tipo "homepage" (un dashboard con links a servicios internos del equipo: 1Panel, Excalidraw, Grafana, etc.). Mejorás títulos y descripciones para que sean concisos, claros, en castellano rioplatense.

Reglas:
- Título: máximo 60 caracteres, sin emoji, sin el nombre del sitio al final (eso lo agrega el portal).
- Descripción: máximo 150 caracteres, una sola oración, sin jerga innecesaria.
- Devolvés SOLO un JSON con el formato {"title": "...", "description": "..."}, sin markdown, sin explicaciones.
- Si el título/descripción ya están bien, los devolvés casi iguales (sólo arreglás ortografía/claridad obvia).`;
