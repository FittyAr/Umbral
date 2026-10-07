import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { AddressInfo } from 'node:net';

// Máquina de estados de los webhooks contra un receptor local. Con el
// default minFailures=3, `health_fail` nunca salía: desde la segunda falla
// `wasHealthy` era false y no se entraba a la rama del evento.
describe('webhooks de health check', () => {
  let server: http.Server;
  let received: Array<{ event: string }> = [];
  let dataDir: string;
  let prevDataDir: string | undefined;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        received.push(JSON.parse(body));
        res.end('ok');
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'umbral-wh-'));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = dataDir;
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('adapta el payload al preset (ntfy publica en la raíz con el topic de la URL)', async () => {
    const { adaptPayload } = await import('~/lib/webhooks');
    const payload = {
      event: 'health_fail' as const,
      card: { id: 'c1', title: 'Grafana ñ', url: 'https://g' },
      status: { ok: false, code: 503, latencyMs: 1, error: 'HTTP 503' },
      consecutiveFailures: 3,
      threshold: 3,
      timestamp: new Date().toISOString(),
      portal: { name: 'Umbral' },
    };
    const slack = adaptPayload('slack', payload);
    expect(JSON.parse(slack.body).text).toContain('Grafana');
    const ntfy = adaptPayload('ntfy', payload, 'https://ntfy.example/alertas');
    expect(ntfy.url).toBe('https://ntfy.example/');
    expect(JSON.parse(ntfy.body).topic).toBe('alertas');
    // Headers sólo ASCII: undici rechaza el resto.
    for (const v of Object.values(ntfy.headers)) expect(/^[\x20-\x7e]*$/.test(v)).toBe(true);
  });

  it('dispara health_fail al llegar al umbral y health_recover una sola vez', async () => {
    const { saveConfig } = await import('~/lib/config');
    const { processHealthResults, clearWebhookState } = await import('~/lib/webhooks');
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`;
    await saveConfig({
      features: { webhooks: { enabled: true } },
      webhooks: {
        items: [
          {
            id: 'wh-test-1',
            name: 'test',
            url,
            enabled: true,
            events: ['health_fail', 'health_recover'],
            minFailures: 3,
            cooldownMin: 0,
          },
        ],
      },
    } as never);
    clearWebhookState();
    const check = (ok: boolean) =>
      processHealthResults([{ cardId: 'c1', ok, status: ok ? 200 : 503, url: 'https://x', title: 'X' }]);

    await check(false);
    await check(false);
    expect(received).toHaveLength(0);
    await check(false);
    expect(received.map((r) => r.event)).toEqual(['health_fail']);
    await check(false); // sigue caído: no repite
    expect(received).toHaveLength(1);
    await check(true);
    await check(true);
    expect(received.map((r) => r.event)).toEqual(['health_fail', 'health_recover']);
  });
});
