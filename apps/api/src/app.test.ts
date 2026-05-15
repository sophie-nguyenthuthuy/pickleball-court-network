import { describe, expect, it, vi } from 'vitest';

import { build } from './app.js';

const stubLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: () => stubLogger,
  level: 'info',
} as unknown as Parameters<typeof build>[0]['logger'];

describe('apps/api boot', () => {
  it('healthz responds', async () => {
    const app = await build({ logger: stubLogger });
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});
