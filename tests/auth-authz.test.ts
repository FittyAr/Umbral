import { describe, it, expect } from 'vitest';
import {
  createSessionToken,
  parseSessionToken,
  resolveSession,
  revokeSession,
  csrfForToken,
  safeEqual,
  LEGACY_SUBJECT,
} from '~/lib/auth';
import { requiredRole, hasRole, pickAllowedConfigSections } from '~/lib/authz';
import { resolveClientIp } from '~/lib/client-ip';
import { gateAuthFromClient, restoreClientSecrets } from '~/lib/config/gating';
import { sanitizeConfigForAdmin, sanitizeConfigForClient } from '~/lib/client-config';
import { escapeAuditField } from '~/lib/audit';
import { verifyTotpOnce } from '~/lib/totp';
import { defaultConfig } from '~/lib/config/defaults';
import * as OTPAuth from 'otpauth';
import type { Config } from '~/lib/schema';

const HASH_A = '$2a$12$' + 'a'.repeat(53);
const HASH_B = '$2a$12$' + 'b'.repeat(53);

function cfgWithUsers(users: Array<Partial<NonNullable<Config['auth']>['users'][number]>>, singlePasswordEnabled = true): Config {
  const cfg = defaultConfig();
  cfg.auth = {
    passwordHash: HASH_A,
    csrfToken: 'base-csrf',
    authEpoch: 3,
    singlePasswordEnabled,
    users: users.map((u, i) => ({
      id: `user-000${i}`,
      username: `user${i}`,
      displayName: '',
      passwordHash: HASH_B,
      role: 'viewer',
      userEpoch: 0,
      createdAt: null,
      lastLoginAt: null,
      totpSecret: null,
      oidcSubject: null,
      ...u,
    })),
  };
  return cfg;
}

describe('sesiones', () => {
  it('un user nuevo (userEpoch 0) no queda como super-admin', () => {
    const cfg = cfgWithUsers([{ role: 'viewer' }]);
    const token = createSessionToken({ subject: 'user-0000', authEpoch: 3, userEpoch: 0 });
    const ctx = resolveSession(parseSessionToken(token), cfg);
    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.role).toBe('viewer');
    expect(ctx.isAdmin).toBe(false);
    expect(ctx.actor).toBe('user0');
  });

  it('el token legacy es admin y deja de valer si se deshabilita el password único', () => {
    const token = createSessionToken({ subject: LEGACY_SUBJECT, authEpoch: 3 });
    expect(resolveSession(parseSessionToken(token), cfgWithUsers([{}])).isAdmin).toBe(true);
    expect(resolveSession(parseSessionToken(token), cfgWithUsers([{}], false)).isAuthenticated).toBe(false);
  });

  it('rechaza authEpoch/userEpoch viejos, users borrados y firmas alteradas', () => {
    const cfg = cfgWithUsers([{ userEpoch: 2 }]);
    const stale = createSessionToken({ subject: 'user-0000', authEpoch: 3, userEpoch: 1 });
    expect(resolveSession(parseSessionToken(stale), cfg).isAuthenticated).toBe(false);
    const oldAuth = createSessionToken({ subject: 'user-0000', authEpoch: 2, userEpoch: 2 });
    expect(resolveSession(parseSessionToken(oldAuth), cfg).isAuthenticated).toBe(false);
    const ghost = createSessionToken({ subject: 'user-9999', authEpoch: 3, userEpoch: 2 });
    expect(resolveSession(parseSessionToken(ghost), cfg).isAuthenticated).toBe(false);
    const ok = createSessionToken({ subject: 'user-0000', authEpoch: 3, userEpoch: 2 });
    const tampered = ok.replace(/\.(\d+)\.(\d+)\.(\d+)\./, (_m, iat) => `.${iat}.3.9.`);
    expect(parseSessionToken(tampered)).toBeNull();
    expect(parseSessionToken('a.b.c.d')).toBeNull();
  });

  it('vence según ttlHours en el server', () => {
    const cfg = cfgWithUsers([]);
    const issued = Date.now() - (cfg.security.session.ttlHours * 3600 + 10) * 1000;
    const token = createSessionToken({ subject: LEGACY_SUBJECT, authEpoch: 3, now: issued });
    expect(resolveSession(parseSessionToken(token), cfg).isAuthenticated).toBe(false);
  });

  it('el logout revoca la sesión', () => {
    const cfg = cfgWithUsers([]);
    const token = createSessionToken({ subject: LEGACY_SUBJECT, authEpoch: 3 });
    const claims = parseSessionToken(token)!;
    expect(resolveSession(claims, cfg).isAuthenticated).toBe(true);
    revokeSession(claims, 24);
    expect(resolveSession(claims, cfg).isAuthenticated).toBe(false);
  });

  it('el CSRF es por sesión', () => {
    const cfg = cfgWithUsers([]);
    const t1 = createSessionToken({ subject: LEGACY_SUBJECT, authEpoch: 3 });
    const t2 = createSessionToken({ subject: LEGACY_SUBJECT, authEpoch: 3 });
    const c1 = resolveSession(parseSessionToken(t1), cfg).csrfToken;
    expect(c1).toBe(csrfForToken(t1, 'base-csrf'));
    expect(c1).not.toBe(resolveSession(parseSessionToken(t2), cfg).csrfToken);
    expect(c1).not.toBe('base-csrf');
    expect(safeEqual(c1, c1)).toBe(true);
    expect(safeEqual(c1, 'x')).toBe(false);
  });
});

describe('autorización por rol', () => {
  it('viewer sólo lee; editor edita contenido; admin el resto', () => {
    expect(hasRole('viewer', requiredRole('/api/config', 'GET'))).toBe(true);
    expect(hasRole('viewer', requiredRole('/api/config', 'PUT'))).toBe(false);
    expect(hasRole('editor', requiredRole('/api/config', 'PUT'))).toBe(true);
    expect(hasRole('editor', requiredRole('/api/config', 'DELETE'))).toBe(false);
    expect(hasRole('editor', requiredRole('/api/import', 'PUT'))).toBe(false);
    expect(hasRole('editor', requiredRole('/api/icon-packs/uninstall', 'POST'))).toBe(false);
    expect(hasRole('admin', requiredRole('/api/icon-packs/uninstall', 'POST'))).toBe(true);
    // Rutas no listadas: admin.
    expect(requiredRole('/api/nueva-ruta', 'GET')).toBe('admin');
    expect(hasRole(null, 'viewer')).toBe(false);
  });

  it('un editor no puede tocar auth, security ni apiTokens', () => {
    const update = { cards: [], auth: { users: [] }, security: {}, apiTokens: {}, theme: {} };
    expect(Object.keys(pickAllowedConfigSections(update, 'editor')).sort()).toEqual(['cards', 'theme']);
    expect(pickAllowedConfigSections(update, 'viewer')).toEqual({});
    expect(pickAllowedConfigSections(update, 'admin')).toBe(update);
  });
});

describe('IP del cliente', () => {
  it('sin proxy confiable ignora X-Forwarded-For', () => {
    expect(resolveClientIp({ socketIp: '1.2.3.4', forwardedFor: '9.9.9.9', trustForwarded: false })).toBe('1.2.3.4');
  });
  it('con un salto confiable toma la última entrada (la agregada por el proxy)', () => {
    expect(
      resolveClientIp({ socketIp: '10.0.0.2', forwardedFor: '6.6.6.6, 203.0.113.7', trustForwarded: true }),
    ).toBe('203.0.113.7');
  });
  it('con trustedProxies saltea los proxies y no confía en un socket externo', () => {
    const trustedProxies = ['10.0.0.0/8'];
    expect(
      resolveClientIp({ socketIp: '10.0.0.2', forwardedFor: '6.6.6.6, 203.0.113.7, 10.0.0.9', trustForwarded: true, trustedProxies }),
    ).toBe('203.0.113.7');
    expect(
      resolveClientIp({ socketIp: '198.51.100.1', forwardedFor: '6.6.6.6', trustForwarded: true, trustedProxies }),
    ).toBe('198.51.100.1');
  });
});

describe('auth desde el panel', () => {
  const features = { multiUser: { enabled: true } };

  it('conserva hash, seed TOTP y epoch del server', () => {
    const current = cfgWithUsers([{ role: 'editor', totpSecret: 'enc', userEpoch: 4 }]).auth!;
    const incoming = { users: [{ ...current.users[0], passwordHash: '', totpSecret: 'active', userEpoch: 0, role: 'admin' as const }] };
    const out = gateAuthFromClient(current, incoming, features);
    expect(out.users[0].passwordHash).toBe(HASH_B);
    expect(out.users[0].totpSecret).toBe('enc');
    expect(out.users[0].userEpoch).toBe(4);
    expect(out.users[0].role).toBe('admin');
    expect(out.passwordHash).toBe(HASH_A);
  });

  it('un hash nuevo sube el userEpoch; un user nuevo exige hash', () => {
    const current = cfgWithUsers([{ userEpoch: 1 }]).auth!;
    const changed = gateAuthFromClient(current, { users: [{ ...current.users[0], passwordHash: HASH_A }] }, features);
    expect(changed.users[0].userEpoch).toBe(2);
    expect(() =>
      gateAuthFromClient(current, { users: [...current.users, { ...current.users[0], id: 'user-new1', passwordHash: '' }] }, features),
    ).toThrow();
  });

  it('repone los secretos que el cliente manda vacíos', () => {
    const current = defaultConfig();
    current.ai = { ...current.ai!, apiKey: 'sk-real' };
    const restored = restoreClientSecrets(current, { ai: { apiKey: '' } }) as { ai: { apiKey: string } };
    expect(restored.ai.apiKey).toBe('sk-real');
    const changed = restoreClientSecrets(current, { ai: { apiKey: 'sk-new' } }) as { ai: { apiKey: string } };
    expect(changed.ai.apiKey).toBe('sk-new');
  });

  it('el config del admin no lleva hashes ni seeds', () => {
    const cfg = cfgWithUsers([{ totpSecret: 'enc' }]);
    const admin = sanitizeConfigForAdmin(cfg);
    const json = JSON.stringify(admin);
    expect(json).not.toContain(HASH_A);
    expect(json).not.toContain(HASH_B);
    expect(json).not.toContain('base-csrf');
    expect(admin.auth?.users[0].totpSecret).toBe('active');
    expect(sanitizeConfigForClient(cfg).auth).toBeUndefined();
  });
});

describe('audit log', () => {
  it('escapa saltos de línea y tabs', () => {
    expect(escapeAuditField('a\nb\tc\\d\u0001')).toBe('a\\nb\\tc\\\\d\\x01');
  });
});

describe('TOTP', () => {
  it('un código no se acepta dos veces', () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 });
    const now = Date.now();
    const code = totp.generate({ timestamp: now });
    expect(verifyTotpOnce('u1', secret, code, now)).toBe(true);
    expect(verifyTotpOnce('u1', secret, code, now)).toBe(false);
  });
});
