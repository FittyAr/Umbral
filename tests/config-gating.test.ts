import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  gateAuth,
  gateCards,
  gateMaintenanceWindows,
  mergeFeatures,
} from '../src/lib/config/gating.ts';
import type { Card } from '../src/lib/schema/index.ts';

/** Card mínima válida para probar el gating. */
function card(over: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    title: 'Card',
    kind: 'link',
    description: '',
    descriptionFormat: 'plain',
    tags: [],
    pinned: false,
    latencyThresholdMs: 0,
    url: 'https://example.com',
    icon: 'lucide/globe',
    category: 'dev',
    openInNewTab: true,
    color: '#60a5fa',
    order: 0,
    span: 1,
    enabled: true,
    healthCheck: false,
    ...over,
  } as Card;
}

const ON = { enabled: true };
const OFF = { enabled: false };

describe('mergeFeatures', () => {
  test('un toggle no pisa a los demás', () => {
    const merged = mergeFeatures(
      { markdown: ON, tags: OFF, i18n: { enabled: true, locale: 'en' } },
      { tags: ON },
    );
    assert.deepEqual(merged.markdown, ON);
    assert.deepEqual(merged.tags, ON);
    assert.deepEqual(merged.i18n, { enabled: true, locale: 'en' });
  });

  test('mergea dentro de la feature en vez de reemplazarla', () => {
    const merged = mergeFeatures({ i18n: { enabled: true, locale: 'es' } }, { i18n: { locale: 'pt' } });
    assert.deepEqual(merged.i18n, { enabled: true, locale: 'pt' });
  });

  test('tolera current y update ausentes', () => {
    assert.deepEqual(mergeFeatures(undefined, undefined), {});
  });
});

describe('gateCards', () => {
  test('markdown apagado fuerza plain y corta en 200 chars', () => {
    const long = 'x'.repeat(500);
    const [out] = gateCards([card({ description: long, descriptionFormat: 'markdown' })], { markdown: OFF });
    assert.equal(out.descriptionFormat, 'plain');
    assert.equal(out.description.length, 200);
  });

  test('markdown prendido permite 1000 chars sólo en formato markdown', () => {
    const long = 'x'.repeat(1500);
    const [md] = gateCards([card({ description: long, descriptionFormat: 'markdown' })], { markdown: ON });
    const [plain] = gateCards([card({ description: long, descriptionFormat: 'plain' })], { markdown: ON });
    assert.equal(md.description.length, 1000);
    assert.equal(plain.description.length, 200);
  });

  test('tags apagado dropea el array y pinned apagado fuerza false', () => {
    const [out] = gateCards([card({ tags: ['a', 'b'], pinned: true })], { markdown: OFF });
    assert.equal('tags' in out, false);
    assert.equal(out.pinned, false);
  });

  test('con las features prendidas los campos sobreviven', () => {
    const [out] = gateCards([card({ tags: ['a'], pinned: true })], { tags: ON, pinned: ON });
    assert.deepEqual(out.tags, ['a']);
    assert.equal(out.pinned, true);
  });
});

describe('gateMaintenanceWindows', () => {
  const win = {
    id: 'mw000001',
    cardIds: ['*'],
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-01-01T01:00:00.000Z',
    reason: '',
    enabled: true,
  };

  test('con la feature apagada no persiste nada', () => {
    const out = gateMaintenanceWindows({ items: [win] }, { items: [win] }, { maintenanceWindows: OFF });
    assert.deepEqual(out, { items: [] });
  });

  test('con la feature prendida el update gana y sin update se preserva', () => {
    const on = { maintenanceWindows: ON };
    assert.deepEqual(gateMaintenanceWindows({ items: [] }, { items: [win] }, on), { items: [win] });
    assert.deepEqual(gateMaintenanceWindows({ items: [win] }, undefined, on), { items: [win] });
  });
});

describe('gateAuth', () => {
  const base = {
    passwordHash: 'hash',
    csrfToken: 'csrf',
    authEpoch: 3,
    users: [],
    singlePasswordEnabled: true,
  };
  const user = {
    id: 'u1234567',
    username: 'alice',
    displayName: 'Alice',
    passwordHash: 'h',
    role: 'admin' as const,
    userEpoch: 0,
    createdAt: null,
    lastLoginAt: null,
  };

  test('sin multiUser se vacían los users y vuelve el rescue path', () => {
    const out = gateAuth({ ...base, users: [user], singlePasswordEnabled: false }, undefined, { multiUser: OFF });
    assert.deepEqual(out.users, []);
    assert.equal(out.singlePasswordEnabled, true);
  });

  test('un PUT no puede pisar el hash, el csrf ni el epoch', () => {
    const incoming = {
      users: [user],
      singlePasswordEnabled: false,
      passwordHash: 'atacante',
      csrfToken: 'atacante',
      authEpoch: 0,
    } as Parameters<typeof gateAuth>[1];
    const out = gateAuth(base, incoming, { multiUser: ON });
    assert.equal(out.passwordHash, 'hash');
    assert.equal(out.csrfToken, 'csrf');
    assert.equal(out.authEpoch, 3);
    assert.equal(out.users.length, 1);
    assert.equal(out.singlePasswordEnabled, false);
  });

  test('sin auth previo devuelve una base vacía en vez de undefined', () => {
    const out = gateAuth(undefined, undefined, { multiUser: ON });
    assert.deepEqual(out.users, []);
    assert.equal(out.passwordHash, '');
  });
});
