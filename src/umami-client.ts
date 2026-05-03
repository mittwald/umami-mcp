export class UmamiApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    body: string,
  ) {
    super(`Umami API ${status} on ${path}: ${truncate(body, 500)}`);
    this.name = 'UmamiApiError';
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

export type UmamiClientOptions = {
  url: string;
  username: string;
  password: string;
  fetchImpl?: typeof fetch;
  /** Per-request timeout in ms. Default 15s. */
  requestTimeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;

export class UmamiClient {
  private token: string | null = null;
  private loginPromise: Promise<string> | null = null;
  private readonly url: string;
  private readonly username: string;
  private readonly password: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: UmamiClientOptions) {
    this.url = opts.url.replace(/\/+$/, '');
    this.username = opts.username;
    this.password = opts.password;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, path: string): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      return await fn(ctrl.signal);
    } catch (err) {
      if (ctrl.signal.aborted) {
        throw new UmamiApiError(0, path, `request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async login(): Promise<string> {
    const path = '/api/auth/login';
    const res = await this.withTimeout(
      (signal) =>
        this.fetchImpl(`${this.url}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: this.username, password: this.password }),
          signal,
        }),
      path,
    );
    if (!res.ok) {
      throw new UmamiApiError(res.status, path, await res.text());
    }
    const data = (await res.json()) as { token: string };
    if (!data?.token) {
      throw new UmamiApiError(res.status, path, 'login response missing token');
    }
    this.token = data.token;
    return data.token;
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    if (!this.loginPromise) {
      this.loginPromise = this.login().finally(() => {
        this.loginPromise = null;
      });
    }
    return this.loginPromise;
  }

  async request<T>(
    path: string,
    init: { method?: string; query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${this.url}${path}`);
    for (const [k, v] of Object.entries(init.query ?? {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const send = (token: string) =>
      this.withTimeout(
        (signal) =>
          this.fetchImpl(url, {
            method: init.method ?? 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: init.body ? JSON.stringify(init.body) : undefined,
            signal,
          }),
        path,
      );

    let token = await this.getToken();
    let res = await send(token);

    if (res.status === 401) {
      this.token = null;
      token = await this.getToken();
      res = await send(token);
    }

    if (!res.ok) {
      throw new UmamiApiError(res.status, path, await res.text());
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}

export function timeRange(input: {
  startAt?: string;
  endAt?: string;
  rangeDays?: number;
}): { startAt: number; endAt: number } {
  const now = Date.now();
  const days = input.rangeDays ?? 7;
  const endAt = input.endAt ? new Date(input.endAt).getTime() : now;
  const startAt = input.startAt
    ? new Date(input.startAt).getTime()
    : endAt - days * 24 * 60 * 60 * 1000;
  return { startAt, endAt };
}
