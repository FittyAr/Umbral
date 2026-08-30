import { z } from 'zod';
import { SAFE_CARD_URL } from './primitives.ts';

// ──────────────────────────────────────────────────────────────────────────
// Cards
// ──────────────────────────────────────────────────────────────────────────
export const CardSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  // kind: 'link' = tarjeta clickeable normal (con URL). 'note' = tarjeta
  // informativa, sin link — el `url` es opcional y la card no es clickeable.
  // Útil para tips, anuncios, info fija del equipo, etc.
  kind: z.enum(['link', 'note']).default('link'),
  // BUGFIX (PUT /api/config 400 reportado por el user): el .max(200) +
  // .default('') original rechazaba cualquier descripción de más de 200
  // chars con "String must contain at most 200 character(s)". El user tenía
  // cards con descripciones largas pre-existentes (pegar descripciones de
  // Wikipedia, IA devolvió más de lo pedido, etc.) y no podía guardar la
  // config. Ahora clampeamos en vez de rechazar: el texto largo se trunca
  // silenciosamente a 200 chars al guardar. Si el user quiere algo más
  // corto, lo edita a mano.
  //
  // Para hacer esto sin romper la validación, sacamos .max(200) y dejamos
  // solo el .transform() que SIEMPRE corre (no necesita pasar validación
  // previa). El tipo resultante sigue siendo string, así que el resto del
  // código no cambia.
  //
  // Markdown: si `features.markdown.enabled`, el admin puede usar formato
  // rico (1000 chars). Si está apagada, se clampea a 200 y se renderiza
  // como plain. El handler saveConfig decide el límite según la feature
  // (no acá en el schema, para que el JSON legacy siga parseable).
  description: z.string().default(''),
  // 'plain' (default) = texto plano escapado por Astro. 'markdown' = se
  // parsea con marked + DOMPurify antes de inyectar. Si la feature
  // features.markdown está apagada, saveConfig fuerza 'plain'
  // independientemente del JSON (ver saveConfig abajo).
  descriptionFormat: z.enum(['plain', 'markdown']).default('plain'),
  // Tags (opt-in: features.tags). Array de strings kebab-case
  // lowercase, max 30 chars cada uno, max 10 por card. Las tags son
  // cross-cutting (una card puede tener tags de varias "dimensiones":
  // ej: "urgent", "frontend", "legacy"). Se usan para búsqueda y filtrado.
  // Si la feature está apagada, saveConfig dropea este campo (defense in
  // depth — el server no persiste tags si el admin no las activó).
  //
  // El preprocess normaliza cada tag (lowercase, kebab-case, trim, max 30
  // chars) ANTES de validar. Tags inválidos (después de normalizar) se
  // dropean silenciosamente con un filter. La dedup se hace acá también.
  tags: z.preprocess(
    (raw) => {
      if (!Array.isArray(raw)) return [];
      const seen = new Set<string>();
      const out: string[] = [];
      for (const t of raw) {
        if (typeof t !== 'string') continue;
        const norm = t.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 30);
        if (!/^[a-z0-9-]{1,30}$/.test(norm)) continue;
        if (seen.has(norm)) continue;
        seen.add(norm);
        out.push(norm);
        if (out.length >= 10) break;
      }
      return out;
    },
    z.array(z.string()).max(10, 'Máximo 10 tags por tarjeta'),
  ).default([]),
  // Pinned (opt-in: features.pinned). Las cards pinned se renderizan
  // primero en su categoría, sin importar el `order`. Default false (no
  // pinned). Si la feature está apagada, el server fuerza `false` por
  // defense in depth — un request que mande `pinned: true` sin la
  // feature activa queda persistido como `pinned: false`.
  pinned: z.boolean().default(false),
  // Latency warning threshold (opt-in: features.metrics). Si la card
  // tiene un valor y el último check supera este threshold en ms, se
  // muestra un dot amarillo (no rojo — sigue funcionando pero lento).
  // Default 0 = sin threshold. Si la feature está apagada, este campo
  // se ignora en el render.
  latencyThresholdMs: z.number().int().min(0).max(60_000).default(0),
  // URL: para 'link' es obligatoria; para 'note' es opcional. Aceptamos
  // string vacío como caso válido (no falla el regex). El check de "es
  // obligatoria para link" está en el superRefine de abajo.
  //
  // BUGFIX (cards.10.url inválida reportado por el user): antes hacía solo
  // .refine(regex). El regex rechaza cualquier whitespace, así que un
  // copy-paste con \n al final o un espacio al principio reventaba con
  // "URL inválida" — frustrante y silencioso. Ahora:
  // 1) trim() de espacios/newlines al principio y al final
  // 2) si no tiene esquema y no es path interno (/...), prepend "http://"
  //    (cubre el caso común de tipear "10.155.49.240:40314" sin http://)
  // 3) si empieza con "//" (protocol-relative), prepend "http:"
  // El .refine() corre DESPUÉS del transform, así que la validación es
  // sobre el valor ya normalizado.
  url: z
    .string()
    .max(2048)
    .transform((v) => {
      let s = v.trim();
      if (!s) return s;
      if (s.startsWith('//')) return 'http:' + s;
      if (!/^https?:\/\//i.test(s) && !s.startsWith('/')) return 'http://' + s;
      return s;
    })
    .refine(
      (v) => v === '' || SAFE_CARD_URL.test(v),
      'URL inválida (http(s):// o path interno /...)',
    )
    .default(''),
  icon: z.string().default('globe'), // nombre de ícono (Lucide) o path /api/assets/<file>
  category: z.string().min(1),
  openInNewTab: z.boolean().default(true),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Color debe ser hex')
    .default('#60a5fa'),
  order: z.number().int().min(0).default(0),
  // Ancho de la tarjeta en columnas del grid. El render lo recorta a las
  // columnas disponibles de cada breakpoint (ver lib/card-span.ts), así que
  // el máximo (8 = columnsDesktop máximo) siempre significa "todo el ancho"
  // aunque después cambies la config de layout.
  span: z.number().int().min(1).max(8).default(1),
  enabled: z.boolean().default(true),
  // healthCheck: si true, el home hace ping a la URL periódicamente y muestra
  // un dot verde/rojo en la card. Útil para detectar servicios caídos.
  // Solo aplica a kind='link' — una nota no tiene URL que monitorear.
  // Requiere que la URL responda a HEAD o GET dentro del timeout (default 5s).
  healthCheck: z.boolean().default(false),
}).superRefine((card, ctx) => {
  // kind='link' requiere URL no vacía.
  if (card.kind === 'link' && !card.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['url'],
      message: 'URL requerida para tarjeta tipo "link"',
    });
  }
});

export type Card = z.infer<typeof CardSchema>;
