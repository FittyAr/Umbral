import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newId } from '../src/lib/ids.ts';
import { isCloudMetadataHost } from '../src/lib/ssrf.ts';
import { createGhostCategory, GHOST_ID_PREFIX } from '../src/lib/cards/domain.ts';

test('newId lleva prefijo y no colisiona dentro del mismo milisegundo', () => {
  const ids = new Set(Array.from({ length: 500 }, () => newId('card')));
  assert.equal(ids.size, 500);
  for (const id of ids) assert.match(id, /^card-[0-9a-z]+-[0-9a-z]+$/);
});

test('los ghosts siguen respetando el prefijo que usa el resto del dominio', () => {
  const ghost = createGhostCategory();
  assert.ok(ghost.id.startsWith(GHOST_ID_PREFIX));
  assert.notEqual(ghost.id, createGhostCategory().id);
});

test('los hosts de metadata cloud se bloquean sin importar el case', () => {
  for (const host of ['169.254.169.254', 'metadata.google.internal', 'METADATA.GOOGLE.INTERNAL']) {
    assert.equal(isCloudMetadataHost(host), true, host);
  }
});

test('un host normal no queda bloqueado por la guarda de metadata', () => {
  for (const host of ['example.com', '10.0.0.5', 'metadata.example.com']) {
    assert.equal(isCloudMetadataHost(host), false, host);
  }
});
