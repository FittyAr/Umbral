import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeConfigForClient, buildBootData, serializeJsonForScript } from '../src/lib/client-config.ts';
import { ConfigSchema, type Config } from '../src/lib/schema/index.ts';

function makeConfig(): Config {
  return ConfigSchema.parse({
    theme: { background: {} },
    branding: {},
    layout: {},
    security: { session: {}, auth: {}, uploads: {}, network: {}, headers: {} },
    auth: {
      passwordHash: '$2a$hash-super-admin',
      csrfToken: 'csrf-secreto',
      users: [
        {
          id: 'user-0001',
          username: 'alice',
          displayName: 'Alice',
          passwordHash: '$2a$hash-alice',
          role: 'admin',
          totpSecret: 'totp-seed-alice',
        },
      ],
    },
    ai: { apiKey: 'sk-openai-secreto' },
    externalSearch: { braveApiKey: 'brave-secreto', tavilyApiKey: 'tavily-secreto' },
    oidc: {
      providers: [
        {
          id: 'prov-0001',
          name: 'Keycloak',
          issuer: 'https://idp.example.com',
          clientId: 'umbral',
          clientSecret: 'oidc-secreto',
        },
      ],
    },
    apiTokens: { items: [{ id: 'tok-00001', name: 'ci', tokenHash: '$2a$hash-token' }] },
  }) as Config;
}

const SECRETS = [
  '$2a$hash-super-admin',
  'csrf-secreto',
  '$2a$hash-alice',
  'totp-seed-alice',
  'sk-openai-secreto',
  'brave-secreto',
  'tavily-secreto',
  'oidc-secreto',
  '$2a$hash-token',
];

test('sanitizeConfigForClient borra todos los secretos conocidos', () => {
  const serialized = JSON.stringify(sanitizeConfigForClient(makeConfig()));
  for (const secret of SECRETS) {
    assert.ok(!serialized.includes(secret), `el secreto ${secret} sigue en el payload`);
  }
});

test('sanitizeConfigForClient no muta el config original ni pierde datos publicos', () => {
  const cfg = makeConfig();
  const sanitized = sanitizeConfigForClient(cfg);
  assert.equal(cfg.auth.passwordHash, '$2a$hash-super-admin');
  assert.equal(cfg.ai.apiKey, 'sk-openai-secreto');
  assert.equal(sanitized.branding.title, cfg.branding.title);
  assert.equal(sanitized.oidc.providers[0].name, 'Keycloak');
  assert.equal(sanitized.apiTokens.items[0].name, 'ci');
});

test('buildBootData no emite el config fuera del build demo', () => {
  const cfg = makeConfig();
  const prod = buildBootData({ base: '/', isDemoBuild: false, config: cfg });
  assert.equal(prod.demoConfig, undefined);
  assert.equal(prod.demo, false);

  const demo = serializeJsonForScript(buildBootData({ base: '/', isDemoBuild: true, config: cfg }));
  assert.ok(demo.includes('"demoConfig"'));
  for (const secret of SECRETS) {
    assert.ok(!demo.includes(secret), `el secreto ${secret} sale en los datos de boot del demo`);
  }
});

test('buildBootData sólo manda el portal si no es el default', () => {
  const cfg = makeConfig();
  assert.equal(buildBootData({ base: '/', isDemoBuild: false, config: cfg, portalId: 'default' }).portal, undefined);
  assert.equal(buildBootData({ base: '/', isDemoBuild: false, config: cfg, portalId: 'ventas' }).portal, 'ventas');
});

test('serializeJsonForScript no deja cerrar el <script> ni abrir comentarios', () => {
  const out = serializeJsonForScript({ name: '</script><script>alert(1)</script><!-- & -->' });
  assert.ok(!out.includes('<'), out);
  assert.ok(!out.includes('>'), out);
  assert.ok(!out.includes('&'), out);
  assert.deepEqual(JSON.parse(out), { name: '</script><script>alert(1)</script><!-- & -->' });
});

test('los layouts no serializan el config a mano', () => {
  for (const file of ['src/layouts/AdminLayout.astro', 'src/layouts/PublicLayout.astro']) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(
      !/JSON\.stringify\(config\)/.test(src),
      `${file} serializa el config sin pasar por sanitizeConfigForClient`,
    );
    assert.match(src, /buildBootData\(/, `${file} deberia usar buildBootData`);
  }
});
