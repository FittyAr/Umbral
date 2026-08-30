import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { tailFile } from '~/lib/audit';

describe('tailFile', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'umbral-tail-'));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns empty for non-existent file', async () => {
    expect(await tailFile(path.join(tmpDir, 'nope.log'), 10)).toEqual([]);
  });

  it('returns empty for empty file', async () => {
    const p = path.join(tmpDir, 'empty.log');
    await fs.writeFile(p, '');
    expect(await tailFile(p, 10)).toEqual([]);
  });

  it('returns all lines when fewer than maxLines', async () => {
    const p = path.join(tmpDir, 'small.log');
    await fs.writeFile(p, 'line1\nline2\nline3\n');
    expect(await tailFile(p, 10)).toEqual(['line1', 'line2', 'line3']);
  });

  it('returns only the last N lines', async () => {
    const p = path.join(tmpDir, 'many.log');
    const lines = Array.from({ length: 100 }, (_, i) => `line${i}`);
    await fs.writeFile(p, lines.join('\n') + '\n');
    const result = await tailFile(p, 5);
    expect(result.length).toBe(5);
    expect(result).toEqual(['line95', 'line96', 'line97', 'line98', 'line99']);
  });

  it('handles file without trailing newline', async () => {
    const p = path.join(tmpDir, 'no-trail.log');
    await fs.writeFile(p, 'a\nb\nc');
    expect(await tailFile(p, 10)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty for maxLines = 0', async () => {
    const p = path.join(tmpDir, 'zero.log');
    await fs.writeFile(p, 'a\n');
    expect(await tailFile(p, 0)).toEqual([]);
  });
});
