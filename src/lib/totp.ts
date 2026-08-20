/**
 * TOTP (Time-based One-Time Password) helpers (opt-in: features.totp2fa).
 *
 * Implementa el standard RFC 6238 con HMAC-SHA1 (compatible con Google
 * Authenticator, Authy, 1Password, Bitwarden, etc.) usando la lib
 * `otpauth` (~10KB, sin binarios nativos).
 *
 * Por qué ciframos el secret en disco: el secret compartido (TOTP key)
 * es lo único que necesita un atacante para generar códigos válidos. Si
 * el config.json se filtra, queremos que el atacante no pueda usar los
 * secrets TOTP directamente. Cifrado simétrico AES-256-GCM con la
 * SESSION_SECRET como derivación de key (vía HKDF). Si el admin rota
 * SESSION_SECRET, los secrets TOTP se invalidan (feature de defensa
 * en profundidad: si el secret del server cambió, asumimos compromiso
 * y no queremos mantener material criptográfico).
 *
 * Por qué NO protegemos con TOTP al super-admin: el plan lo dice
 * explícitamente. El password único es el rescue path final. Si el
 * admin pierde acceso a su app TOTP, sigue pudiendo entrar con el
 * password. Una vez dentro, puede desactivar 2FA de los users.
 *
 * Window: usamos ±1 step (30s antes/después) para tolerar drift de
 * reloj del celular. Si el user tiene drift > 30s, debe sincronizar
 * el reloj — no es responsabilidad del server.
 */

import * as OTPAuth from 'otpauth';
import crypto from 'node:crypto';

const TOTP_WINDOW = 1; // ±1 step (30s)
const TOTP_ISSUER = 'Umbral';
const KEY_LEN = 32; // AES-256
const IV_LEN = 12; // GCM
const AUTH_TAG_LEN = 16;

/** Genera un secret TOTP nuevo (base32, ~20 chars). Lo retorna en
 *  plaintext para mostrarlo en el QR la primera vez. Después de confirmar
 *  el primer código, lo ciframos y persistimos. */
export function generateTotpSecret(): string {
  // 20 bytes = ~160 bits de entropía, compatible con todos los apps
  // populares. OTPAuth.Secret genera un string base32.
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/** Construye la URL otpauth:// que se mete en el QR. La mayoria de los
 *  apps la parsean automáticamente y solo piden al user "scan QR". */
export function getQrCodeUrl(username: string, secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

/** Verifica un código TOTP de 6 dígitos contra el secret. Devuelve
 *  true si es válido (dentro del window). */
export function verifyTotp(secret: string, code: string): boolean {
  // Validar formato antes de parsear
  if (!/^\d{6}$/.test(code)) return false;
  try {
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token: code, window: TOTP_WINDOW });
    return delta !== null;
  } catch {
    return false;
  }
}

// ── Cifrado simétrico del secret en disco ────────────────────────
// Usamos AES-256-GCM con key derivada de SESSION_SECRET vía HKDF-SHA256.
// Si el server se reinicia con una SESSION_SECRET distinta, los secrets
// TOTP existentes son ilegibles → el admin debe re-configurar 2FA por
// cada user. Esto es defense-in-depth (asumimos compromiso si la secret
// del server cambió, no queremos mantener material criptográfico bajo
// una key posiblemente comprometida).

function deriveKey(passphrase: string): Buffer {
  // Salt fijo (no por-user) — el espacio de búsqueda para un atacante
  // sería el mismo SESSION_SECRET. HKDF estira la entropía correctamente.
  // Si quisieramos per-user salts, podríamos usar el userId, pero
  // complica el flow de reset de SESSION_SECRET.
  const salt = Buffer.from('umbral-totp-encryption-v1', 'utf8');
  return crypto.hkdfSync('sha256', Buffer.from(passphrase, 'utf8'), salt, '', KEY_LEN);
}

let _key: Buffer | null = null;
function getKey(): Buffer {
  if (_key) return _key;
  const secret = process.env.SESSION_SECRET || '';
  if (!secret) {
    // En dev sin SESSION_SECRET, derivamos de un fallback (NO usar en
    // producción — getSecret() en auth.ts ya tiene el mismo fallback).
    _key = deriveKey('umbral-dev-fallback');
  } else {
    _key = deriveKey(secret);
  }
  return _key;
}

/** Cifra el secret TOTP para guardarlo en disco. */
export function encryptTotpSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Formato: base64(iv + authTag + ciphertext). Sin separador — el
  // largo fijo (12 + 16 = 28 bytes de header) permite split seguro.
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/** Descifra un secret TOTP del disco. Lanza si está corrupto o si la
 *  SESSION_SECRET cambió. */
export function decryptTotpSecret(encoded: string): string {
  const key = getKey();
  const buf = Buffer.from(encoded, 'base64');
  if (buf.length < IV_LEN + AUTH_TAG_LEN) {
    throw new Error('TOTP secret malformado');
  }
  const iv = buf.subarray(0, IV_LEN);
  const authTag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}