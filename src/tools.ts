import { z } from 'zod';
import { UmamiClient, timeRange } from './umami-client.js';

const dateRangeShape = {
  startAt: z
    .string()
    .optional()
    .describe('ISO date/time of range start. Defaults to rangeDays before endAt.'),
  endAt: z.string().optional().describe('ISO date/time of range end. Defaults to now.'),
  rangeDays: z
    .number()
    .int()
    .positive()
    .max(365)
    .optional()
    .describe('Convenience: range length in days when startAt is omitted. Default 7.'),
};

const websiteIdShape = {
  websiteId: z
    .string()
    .optional()
    .describe(
      'Umami website ID (UUID). Optional if the server is configured with a default website ID via the X-Umami-Website-Id request header. Use list_websites to discover IDs.',
    ),
};

function resolveWebsiteId(client: UmamiClient, args: { websiteId?: string }): string {
  const id = args.websiteId ?? client.defaultWebsiteId;
  if (!id) {
    throw new Error(
      'No websiteId provided and no default configured. Pass websiteId in the tool arguments or set the X-Umami-Website-Id header on the MCP transport.',
    );
  }
  return id;
}

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  handler: (client: UmamiClient, args: Record<string, unknown>) => Promise<unknown>;
};

export const tools: ToolDefinition[] = [
  {
    name: 'list_websites',
    description:
      'List all websites the authenticated user has access to. Returns id, name, domain. Call first to obtain website IDs.',
    inputSchema: z.object({
      includeTeams: z
        .boolean()
        .optional()
        .describe('Include websites owned by teams the user belongs to.'),
    }),
    handler: async (client, args) => {
      const includeTeams = args.includeTeams === true;
      return client.request('/api/me/websites', {
        query: includeTeams ? { includeTeams: '1', pageSize: 200 } : { pageSize: 200 },
      });
    },
  },
  {
    name: 'get_stats',
    description:
      'Aggregate stats for a website: pageviews, visitors, visits, bounces, total time. Includes comparison vs previous period.',
    inputSchema: z.object({ ...websiteIdShape, ...dateRangeShape }),
    handler: async (client, args) => {
      const { websiteId, ...rest } = args as { websiteId?: string };
      const id = resolveWebsiteId(client, { websiteId });
      const range = timeRange(rest as Parameters<typeof timeRange>[0]);
      return client.request(`/api/websites/${id}/stats`, { query: range });
    },
  },
  {
    name: 'get_pageviews',
    description:
      'Time-series of pageviews and sessions grouped by unit (hour/day/month/year). Use for traffic charts.',
    inputSchema: z.object({
      ...websiteIdShape,
      ...dateRangeShape,
      unit: z
        .enum(['minute', 'hour', 'day', 'month', 'year'])
        .optional()
        .describe('Bucket size. Default day.'),
      timezone: z.string().optional().describe('IANA timezone, e.g. Europe/Berlin.'),
    }),
    handler: async (client, args) => {
      const { websiteId, unit, timezone, ...rest } = args as {
        websiteId?: string;
        unit?: string;
        timezone?: string;
      };
      const id = resolveWebsiteId(client, { websiteId });
      const range = timeRange(rest as Parameters<typeof timeRange>[0]);
      return client.request(`/api/websites/${id}/pageviews`, {
        query: { ...range, unit: unit ?? 'day', timezone: timezone ?? 'UTC' },
      });
    },
  },
  {
    name: 'get_metrics',
    description:
      'Top-N breakdown for a single dimension. Valid types: path, entry, exit, title, referrer, domain, query, event, tag, hostname, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, browser, os, device, screen, language, country, region, city, channel.',
    inputSchema: z.object({
      ...websiteIdShape,
      ...dateRangeShape,
      type: z
        .enum([
          'path',
          'entry',
          'exit',
          'title',
          'referrer',
          'domain',
          'query',
          'event',
          'tag',
          'hostname',
          'utmSource',
          'utmMedium',
          'utmCampaign',
          'utmContent',
          'utmTerm',
          'browser',
          'os',
          'device',
          'screen',
          'language',
          'country',
          'region',
          'city',
          'channel',
        ])
        .describe('Dimension to break down by.'),
      limit: z.number().int().positive().max(500).optional().describe('Max rows. Default 10.'),
    }),
    handler: async (client, args) => {
      const { websiteId, type, limit, ...rest } = args as {
        websiteId?: string;
        type: string;
        limit?: number;
      };
      const id = resolveWebsiteId(client, { websiteId });
      const range = timeRange(rest as Parameters<typeof timeRange>[0]);
      return client.request(`/api/websites/${id}/metrics`, {
        query: { ...range, type, limit: limit ?? 10 },
      });
    },
  },
  {
    name: 'get_active_visitors',
    description: 'Number of currently active visitors on a website (real-time).',
    inputSchema: z.object({ ...websiteIdShape }),
    handler: async (client, args) => {
      const id = resolveWebsiteId(client, args as { websiteId?: string });
      return client.request(`/api/websites/${id}/active`);
    },
  },
  {
    name: 'get_realtime_activity',
    description:
      'Real-time stream of pageviews, sessions, events, and visitor counts from the last few minutes. Use to answer "what is happening right now" — richer than get_active_visitors.',
    inputSchema: z.object({ ...websiteIdShape }),
    handler: async (client, args) => {
      const id = resolveWebsiteId(client, args as { websiteId?: string });
      return client.request(`/api/realtime/${id}`);
    },
  },
  {
    name: 'list_sessions',
    description:
      'List sessions for a website in a given range. Returns session metadata; use get_session_activity for the per-session pageview/event timeline.',
    inputSchema: z.object({
      ...websiteIdShape,
      ...dateRangeShape,
      pageSize: z.number().int().positive().max(200).optional().describe('Default 50.'),
      page: z.number().int().positive().optional(),
      search: z.string().optional(),
    }),
    handler: async (client, args) => {
      const { websiteId, pageSize, page, search, ...rest } = args as {
        websiteId?: string;
        pageSize?: number;
        page?: number;
        search?: string;
      };
      const id = resolveWebsiteId(client, { websiteId });
      const range = timeRange(rest as Parameters<typeof timeRange>[0]);
      return client.request(`/api/websites/${id}/sessions`, {
        query: { ...range, pageSize: pageSize ?? 50, page, search },
      });
    },
  },
  {
    name: 'get_session_activity',
    description:
      'Detailed activity for a single session: pageviews and events in chronological order. Use list_sessions to discover sessionIds.',
    inputSchema: z.object({
      ...websiteIdShape,
      sessionId: z.string().describe('Umami session ID.'),
    }),
    handler: async (client, args) => {
      const { websiteId, sessionId } = args as { websiteId?: string; sessionId: string };
      const id = resolveWebsiteId(client, { websiteId });
      return client.request(`/api/websites/${id}/sessions/${sessionId}`);
    },
  },
];
