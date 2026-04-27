import { describe, expect, it, vi } from 'vitest';
import { tools } from '../src/tools.js';
import { UmamiClient } from '../src/umami-client.js';

function findTool(name: string) {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t;
}

function makeStubClient() {
  const request = vi.fn().mockResolvedValue({ ok: true });
  return { request } as unknown as UmamiClient & { request: ReturnType<typeof vi.fn> };
}

describe('tool definitions', () => {
  it('exposes the expected tool set', () => {
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        'get_active_visitors',
        'get_metrics',
        'get_pageviews',
        'get_realtime_activity',
        'get_session_activity',
        'get_stats',
        'list_sessions',
        'list_websites',
      ].sort(),
    );
  });

  it('list_websites passes includeTeams flag through', async () => {
    const client = makeStubClient();
    await findTool('list_websites').handler(client, { includeTeams: true });
    expect(client.request).toHaveBeenCalledWith('/api/me/websites', {
      query: { includeTeams: '1', pageSize: 200 },
    });
  });

  it('get_stats defaults to a 7-day range and adds startAt/endAt', async () => {
    const client = makeStubClient();
    const before = Date.now();
    await findTool('get_stats').handler(client, { websiteId: 'w-1' });
    const after = Date.now();

    const [path, opts] = client.request.mock.calls[0];
    expect(path).toBe('/api/websites/w-1/stats');
    const { startAt, endAt } = opts.query as { startAt: number; endAt: number };
    expect(endAt).toBeGreaterThanOrEqual(before);
    expect(endAt).toBeLessThanOrEqual(after);
    expect(endAt - startAt).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('get_pageviews honors unit + timezone overrides', async () => {
    const client = makeStubClient();
    await findTool('get_pageviews').handler(client, {
      websiteId: 'w-1',
      unit: 'hour',
      timezone: 'Europe/Berlin',
      rangeDays: 1,
    });
    const opts = client.request.mock.calls[0][1];
    expect(opts.query.unit).toBe('hour');
    expect(opts.query.timezone).toBe('Europe/Berlin');
  });

  it('get_metrics rejects unknown type via schema', () => {
    const result = findTool('get_metrics').inputSchema.safeParse({
      websiteId: 'w',
      type: 'nope',
    });
    expect(result.success).toBe(false);
  });

  it('get_active_visitors only requires websiteId', () => {
    const result = findTool('get_active_visitors').inputSchema.safeParse({ websiteId: 'w-1' });
    expect(result.success).toBe(true);
  });

  it('get_session_activity builds the correct path', async () => {
    const client = makeStubClient();
    await findTool('get_session_activity').handler(client, {
      websiteId: 'w-1',
      sessionId: 's-9',
    });
    expect(client.request).toHaveBeenCalledWith('/api/websites/w-1/sessions/s-9');
  });
});
