import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { safeFetch } from '~/lib/safe-fetch';
import { isPrivateOrLoopback, isCloudMetadataHost, normalizeIp } from '~/lib/ssrf';

describe('clasificación de IPs', () => {
  it('cubre rangos que antes pasaban como públicos', () => {
    for (const ip of ['::ffff:127.0.0.1', '[::ffff:7f00:1]', '198.18.0.1', '192.0.0.8', '64:ff9b::a00:1', 'fec0::1', '10.1.2.3', '::1']) {
      expect(isPrivateOrLoopback(ip), ip).toBe(true);
    }
    for (const ip of ['8.8.8.8', '2606:4700::1111', '1.1.1.1']) {
      expect(isPrivateOrLoopback(ip), ip).toBe(false);
    }
    expect(normalizeIp('::ffff:a9fe:a9fe')).toBe('169.254.169.254');
    expect(isCloudMetadataHost('[::ffff:a9fe:a9fe]')).toBe(true);
    expect(isCloudMetadataHost('169.254.169.254')).toBe(true);
    expect(isCloudMetadataHost('metadata.google.internal.')).toBe(true);
  });
});

describe('safeFetch', () => {
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/redirect-metadata') {
        res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' });
        return res.end();
      }
      if (req.url === '/redirect-ok') {
        res.writeHead(302, { location: '/ok' });
        return res.end();
      }
      if (req.url === '/big') {
        res.writeHead(200);
        return res.end(Buffer.alloc(2048));
      }
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('hola');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it('bloquea hosts internos si no están permitidos', async () => {
    await expect(safeFetch(`${base}/ok`)).rejects.toMatchObject({ code: 'blocked' });
    const port = new URL(base).port;
    await expect(safeFetch(`http://localhost:${port}/ok`)).rejects.toMatchObject({ code: 'blocked' });
    await expect(safeFetch(`http://[::ffff:127.0.0.1]:${port}/ok`)).rejects.toMatchObject({ code: 'blocked' });
  });

  it('permite la LAN con allowInternal y sigue redirects válidos', async () => {
    const res = await safeFetch(`${base}/redirect-ok`, { allowInternal: true });
    expect(res.status).toBe(200);
    expect(res.text()).toBe('hola');
  });

  it('valida cada redirect: la metadata se bloquea siempre', async () => {
    await expect(safeFetch(`${base}/redirect-metadata`, { allowInternal: true })).rejects.toMatchObject({
      code: 'blocked',
    });
  });

  it('corta respuestas más grandes que maxBytes', async () => {
    await expect(safeFetch(`${base}/big`, { allowInternal: true, maxBytes: 1024 })).rejects.toMatchObject({
      code: 'too_large',
    });
  });
});
