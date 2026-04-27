import { describe, expect, it, vi } from 'vitest';
import { UmamiApiError, UmamiClient } from '../src/umami-client.js';

type FetchCall = { url: string; init: RequestInit };

function makeFetch(
  responses: Array<{ status: number; body?: unknown; ok?: boolean }>,
): { fn: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  let i = 0;
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({ url, init: init ?? {} });
    const r = responses[i++];
    if (!r) throw new Error('Unexpected fetch call');
    return new Response(r.body !== undefined ? JSON.stringify(r.body) : null, {
      status: r.status,
    });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const baseOpts = { url: 'https://umami.example.com', username: 'u', password: 'p' };

describe('UmamiClient', () => {
  it('logs in lazily and caches the token across requests', async () => {
    const { fn, calls } = makeFetch([
      { status: 200, body: { token: 'tok-1', user: { id: 'x' } } },
      { status: 200, body: [{ id: 'w1' }] },
      { status: 200, body: { active: 5 } },
    ]);
    const client = new UmamiClient({ ...baseOpts, fetchImpl: fn });

    await client.request('/api/me/websites');
    await client.request('/api/websites/w1/active');

    expect(calls).toHaveLength(3);
    expect(calls[0].url).toBe('https://umami.example.com/api/auth/login');
    expect(calls[1].init.headers).toMatchObject({ Authorization: 'Bearer tok-1' });
    expect(calls[2].init.headers).toMatchObject({ Authorization: 'Bearer tok-1' });
  });

  it('re-logs in once on a 401 and retries the request', async () => {
    const { fn, calls } = makeFetch([
      { status: 200, body: { token: 'old' } },
      { status: 401, body: { error: 'expired' } },
      { status: 200, body: { token: 'new' } },
      { status: 200, body: { ok: true } },
    ]);
    const client = new UmamiClient({ ...baseOpts, fetchImpl: fn });

    const result = await client.request<{ ok: boolean }>('/api/websites/w1/stats');

    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(4);
    expect(calls[3].init.headers).toMatchObject({ Authorization: 'Bearer new' });
  });

  it('serializes query params and ignores undefined', async () => {
    const { fn, calls } = makeFetch([
      { status: 200, body: { token: 't' } },
      { status: 200, body: [] },
    ]);
    const client = new UmamiClient({ ...baseOpts, fetchImpl: fn });

    await client.request('/api/websites/w1/metrics', {
      query: { type: 'url', limit: 10, search: undefined, startAt: 1000, endAt: 2000 },
    });

    const url = new URL(calls[1].url);
    expect(url.pathname).toBe('/api/websites/w1/metrics');
    expect(url.searchParams.get('type')).toBe('url');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('startAt')).toBe('1000');
    expect(url.searchParams.has('search')).toBe(false);
  });

  it('throws UmamiApiError on non-2xx (after re-login attempt)', async () => {
    const { fn } = makeFetch([
      { status: 200, body: { token: 't' } },
      { status: 500, body: { error: 'boom' } },
    ]);
    const client = new UmamiClient({ ...baseOpts, fetchImpl: fn });

    await expect(client.request('/api/websites/w1/stats')).rejects.toBeInstanceOf(UmamiApiError);
  });

  it('throws when login itself fails', async () => {
    const { fn } = makeFetch([{ status: 401, body: { error: 'bad creds' } }]);
    const client = new UmamiClient({ ...baseOpts, fetchImpl: fn });

    await expect(client.request('/api/me/websites')).rejects.toThrow(/login/);
  });

  it('deduplicates concurrent logins', async () => {
    let resolveLogin: (v: Response) => void = () => {};
    const loginPromise = new Promise<Response>((r) => {
      resolveLogin = r;
    });
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => loginPromise)
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 })));

    const client = new UmamiClient({ ...baseOpts, fetchImpl: fetchImpl as unknown as typeof fetch });
    const a = client.request('/api/me/websites');
    const b = client.request('/api/me/websites');

    resolveLogin(new Response(JSON.stringify({ token: 't' }), { status: 200 }));
    await Promise.all([a, b]);

    const loginCalls = fetchImpl.mock.calls.filter((c) =>
      String(c[0]).endsWith('/api/auth/login'),
    );
    expect(loginCalls).toHaveLength(1);
  });
});
