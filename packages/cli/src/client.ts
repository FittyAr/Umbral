/**
 * Cliente HTTP minimal para el API REST v1 de Umbral.
 * Auth via Bearer token (apiTokens feature). Sin dependencias externas —
 * usa fetch nativo de Node 18+.
 */
import type { CliConfig } from './config.js';

export class UmbralClient {
  constructor(private cfg: CliConfig) {}

  private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.cfg.url}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.cfg.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let msg = text;
      try { msg = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* */ }
      throw new Error(`HTTP ${res.status} en ${method} ${path}: ${msg}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  get<T = unknown>(path: string) { return this.request<T>('GET', path); }
  post<T = unknown>(path: string, body?: unknown) { return this.request<T>('POST', path, body); }
  put<T = unknown>(path: string, body?: unknown) { return this.request<T>('PUT', path, body); }
  delete<T = unknown>(path: string) { return this.request<T>('DELETE', path); }
}