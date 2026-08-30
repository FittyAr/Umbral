import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Auth (no se expone al admin: vive solo en el JSON raíz)
//
// authEpoch: contador GLOBAL que se incrementa cada vez que cambia la
// password del super-admin. El session token incluye el epoch con el que
// fue emitido; al verificarlo, si no matchea el actual, la sesión es
// inválida. Esto cierra el gap de "cambié la password pero las sesiones
// viejas siguen vivas" — antes sólo se rotaba el CSRF, la session token
// seguía siendo válida hasta expirar.
//
// A partir de Ola 3.1 (features.multiUser), soportamos users[] con
// epoch por usuario (userEpoch: number) para invalidar sesiones de un
// usuario específico (ej: Alice cambia su password) sin tocar a los
// demás. Los tokens de sesión incluyen tanto el authEpoch global como
// el userEpoch al que fueron emitidos.
// ──────────────────────────────────────────────────────────────────────────
export const UserRoleSchema = z.enum(['admin', 'editor', 'viewer']);
export const UserSchema = z.object({
  id: z.string().min(8).max(80),
  username: z.string().min(2).max(40).regex(/^[a-z0-9_-]+$/, 'Username debe ser lowercase, alfanumérico + guiones y underscores'),
  displayName: z.string().min(1).max(80).default(''),
  passwordHash: z.string().min(1),
  role: UserRoleSchema.default('viewer'),
  // epoch por usuario — incrementa cuando ese user cambia su password
  // o es borrado. Permite invalidar sesiones de un user sin tocar a los
  // demás (escenario típico: "comprometieron a Alice, le cambio la pass").
  userEpoch: z.number().int().min(0).default(0),
  createdAt: z.string().datetime().nullable().default(null),
  lastLoginAt: z.string().datetime().nullable().default(null),
  // 2FA: secret TOTP cifrado (sólo si features.totp2fa está activa y el
  // user lo activó). null = sin 2FA. El server lo lee server-side.
  // (El render del admin no muestra esto — sólo el endpoint de login
  // lo valida. La función pública es: 'el admin no debería ver los
  // secrets de los 2FA en ningún lado'.)
  totpSecret: z.string().nullable().default(null).optional(),
});

export const AuthSchema = z.object({
  passwordHash: z.string().min(1),
  csrfToken: z.string().min(1),
  authEpoch: z.number().int().min(0).default(0),
  // Multi-user (opt-in: features.multiUser). Default vacío → legacy mode
  // (sólo password único). Si tiene al menos un user, se activa el modo
  // multi-user. Los users[] se dropean al guardar si la feature está
  // apagada (defense in depth).
  users: z.array(UserSchema).default([]),
  // Si true, el password único (super-admin) sigue siendo válido como
  // rescue path. Default true. El admin puede flipearlo a false desde
  // el tab Password para "solo usuarios + sin rescue path".
  // Validación: si users[] está vacío y singlePasswordEnabled=false,
  // el sistema no es accesible — el server rechaza este estado al
  // guardar (revisar en saveConfig).
  singlePasswordEnabled: z.boolean().default(true),
});
