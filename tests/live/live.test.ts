import { describe, expect, it } from 'vitest';
import { tools } from '../../src/tools.js';
import { UmamiClient } from '../../src/umami-client.js';

const url = process.env.UMAMI_URL;
const username = process.env.UMAMI_USERNAME;
const password = process.env.UMAMI_PASSWORD;

const liveAvailable = Boolean(url && username && password);
const d = liveAvailable ? describe : describe.skip;

function findTool(name: string) {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t;
}

d('live integration against UMAMI_URL', () => {
  const client = new UmamiClient({
    url: url ?? '',
    username: username ?? '',
    password: password ?? '',
  });

  it('list_websites returns at least one website', async () => {
    const result = (await findTool('list_websites').handler(client, {})) as {
      data?: Array<{ id: string; name: string; domain: string }>;
    };
    const list = Array.isArray(result) ? result : (result.data ?? []);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('id');
  });

  it('get_stats returns numeric metrics for the first website', async () => {
    const websitesRaw = (await findTool('list_websites').handler(client, {})) as
      | Array<{ id: string }>
      | { data: Array<{ id: string }> };
    const list = Array.isArray(websitesRaw) ? websitesRaw : websitesRaw.data;
    const websiteId = list[0].id;

    const stats = (await findTool('get_stats').handler(client, {
      websiteId,
      rangeDays: 30,
    })) as {
      pageviews: number;
      visitors: number;
      visits: number;
      bounces: number;
      totaltime: number;
      comparison?: { pageviews: number };
    };

    expect(typeof stats.pageviews).toBe('number');
    expect(typeof stats.visitors).toBe('number');
    expect(typeof stats.visits).toBe('number');
    expect(typeof stats.bounces).toBe('number');
    expect(typeof stats.totaltime).toBe('number');
    expect(stats.comparison).toBeDefined();
    expect(typeof stats.comparison?.pageviews).toBe('number');
  });

  it('get_active_visitors returns a numeric value or object', async () => {
    const websitesRaw = (await findTool('list_websites').handler(client, {})) as
      | Array<{ id: string }>
      | { data: Array<{ id: string }> };
    const list = Array.isArray(websitesRaw) ? websitesRaw : websitesRaw.data;
    const websiteId = list[0].id;

    const result = await findTool('get_active_visitors').handler(client, { websiteId });
    expect(result).toBeDefined();
  });

  it('get_metrics(type=url) returns an array', async () => {
    const websitesRaw = (await findTool('list_websites').handler(client, {})) as
      | Array<{ id: string }>
      | { data: Array<{ id: string }> };
    const list = Array.isArray(websitesRaw) ? websitesRaw : websitesRaw.data;
    const websiteId = list[0].id;

    const result = (await findTool('get_metrics').handler(client, {
      websiteId,
      type: 'path',
      rangeDays: 30,
      limit: 5,
    })) as Array<{ x: string; y: number }>;
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('x');
      expect(result[0]).toHaveProperty('y');
      expect(typeof result[0].y).toBe('number');
    }
  });

  it('get_realtime_activity returns the expected shape', async () => {
    const websitesRaw = (await findTool('list_websites').handler(client, {})) as
      | Array<{ id: string }>
      | { data: Array<{ id: string }> };
    const list = Array.isArray(websitesRaw) ? websitesRaw : websitesRaw.data;
    const websiteId = list[0].id;

    const result = (await findTool('get_realtime_activity').handler(client, { websiteId })) as Record<
      string,
      unknown
    >;
    expect(result).toBeTypeOf('object');
    expect(result).not.toBeNull();
  });

  it('get_pageviews returns pageviews + sessions arrays', async () => {
    const websitesRaw = (await findTool('list_websites').handler(client, {})) as
      | Array<{ id: string }>
      | { data: Array<{ id: string }> };
    const list = Array.isArray(websitesRaw) ? websitesRaw : websitesRaw.data;
    const websiteId = list[0].id;

    const result = (await findTool('get_pageviews').handler(client, {
      websiteId,
      rangeDays: 7,
      unit: 'day',
    })) as { pageviews: unknown[]; sessions: unknown[] };

    expect(Array.isArray(result.pageviews)).toBe(true);
    expect(Array.isArray(result.sessions)).toBe(true);
  });

  it('list_sessions returns paginated session data', async () => {
    const websitesRaw = (await findTool('list_websites').handler(client, {})) as
      | Array<{ id: string }>
      | { data: Array<{ id: string }> };
    const list = Array.isArray(websitesRaw) ? websitesRaw : websitesRaw.data;
    const websiteId = list[0].id;

    const result = (await findTool('list_sessions').handler(client, {
      websiteId,
      rangeDays: 30,
      pageSize: 5,
    })) as { data?: Array<{ id: string }> } | Array<{ id: string }>;

    const sessions = Array.isArray(result) ? result : (result.data ?? []);
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('get_session_activity returns activity for a discovered session', async () => {
    const websitesRaw = (await findTool('list_websites').handler(client, {})) as
      | Array<{ id: string }>
      | { data: Array<{ id: string }> };
    const list = Array.isArray(websitesRaw) ? websitesRaw : websitesRaw.data;
    const websiteId = list[0].id;

    const sessionsResult = (await findTool('list_sessions').handler(client, {
      websiteId,
      rangeDays: 30,
      pageSize: 5,
    })) as { data?: Array<{ id: string }> } | Array<{ id: string }>;
    const sessions = Array.isArray(sessionsResult)
      ? sessionsResult
      : (sessionsResult.data ?? []);

    if (sessions.length === 0) return;
    const activity = await findTool('get_session_activity').handler(client, {
      websiteId,
      sessionId: sessions[0].id,
    });
    expect(activity).toBeDefined();
  });
});
