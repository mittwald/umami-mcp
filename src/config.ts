export type UmamiCredentials = {
  url: string;
  username: string;
  password: string;
};

export type AppConfig = {
  port: number;
  urlAllowlist: string[];
};

export const HOST = '0.0.0.0';

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.MCP_PORT ?? 3334),
    urlAllowlist: parseList(process.env.UMAMI_URL_ALLOWLIST),
  };
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Returns true when `url` is allowed by the patterns.
 * - Empty patterns → allow everything (opt-in feature).
 * - Patterns match against the URL's origin (`scheme://host[:port]`).
 * - `*` wildcards match any character sequence except `/` (one host label
 *   typically).  Examples:
 *     `https://umami.example.com`         exact origin
 *     `https://*.example.com`             any subdomain on https
 *     `https://*.example.com:443`         with explicit port
 */
export function isUrlAllowed(rawUrl: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  const origin = `${parsed.protocol}//${parsed.host}`;
  return patterns.some((pattern) => matchOrigin(origin, pattern));
}

function matchOrigin(origin: string, pattern: string): boolean {
  if (!pattern.includes('*')) {
    return origin === pattern;
  }
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`).test(origin);
}
