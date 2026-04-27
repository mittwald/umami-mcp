# Umami MCP Server

Streamable-HTTP [MCP](https://modelcontextprotocol.io) server for
[Umami Analytics](https://umami.is). Read-only, 8 tools, runs in a container.

## Table of contents

- [Run in Docker](#run-in-docker)
- [Authentication](#authentication)
- [Connect from your client](#connect-from-your-client)
  - [Claude Code](#claude-code)
  - [Claude Desktop](#claude-desktop)
  - [Cursor](#cursor)
  - [n8n](#n8n)
  - [VS Code (Copilot Chat)](#vs-code-copilot-chat)
  - [MCP Inspector (debug)](#mcp-inspector-debug)
- [Tools](#tools)
- [Example prompts](#example-prompts)
- [Configuration](#configuration)
- [Operations](#operations)
- [Development](#development)

## Run in Docker

Published image: **`ghcr.io/mittwald/umami-mcp:latest`** (tags: `latest`, `0.1.0`).

```bash
docker run -d --name umami-mcp -p 3334:3334 \
  --restart unless-stopped \
  ghcr.io/mittwald/umami-mcp:latest
```

The server is credential-free at startup — every client provides its own
Umami credentials via headers (see [Authentication](#authentication)).

Endpoint: `http://127.0.0.1:3334/mcp` · Healthcheck: `GET /health`.

> Build locally instead: `docker build -t umami-mcp .` and use `umami-mcp` as
> the image name.

### docker compose

```yaml
services:
  umami-mcp:
    image: ghcr.io/mittwald/umami-mcp:latest
    ports: ["3334:3334"]
    restart: unless-stopped
```

## Authentication

Each client provides its own Umami credentials via request headers:

- `X-Umami-Url`
- `X-Umami-Username`
- `X-Umami-Password`

The server keeps no global credentials, holds nothing in env, and stores
nothing on disk. Credentials live only in the per-session `UmamiClient`
inside the running process. One server can serve many Umami instances.
Requests without all three headers are rejected with `401`.

## Connect from your client

All client examples below include the required `X-Umami-*` headers. Replace
the URL/credentials with your own.

### Claude Code

```bash
claude mcp add umami http://127.0.0.1:3334/mcp --transport http \
  --header "X-Umami-Url: https://umami.example.com" \
  --header "X-Umami-Username: youruser" \
  --header "X-Umami-Password: yourpass"
```

### Claude Desktop

> The Connectors UI in Claude Desktop currently doesn't support custom HTTP
> headers. Since this server expects `X-Umami-*` headers, you have to edit
> the config file directly.

**Step-by-step:**

1. Quit Claude Desktop (`⌘Q` on macOS · right-click tray → Quit on Win/Linux).
2. Open the config file:

| OS | Path |
| --- | --- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

3. Add (or merge into) `mcpServers`:

   ```json
   {
     "mcpServers": {
       "umami": {
         "type": "http",
         "url": "http://127.0.0.1:3334/mcp",
         "headers": {
           "X-Umami-Url": "https://umami.example.com",
           "X-Umami-Username": "youruser",
           "X-Umami-Password": "yourpass"
         }
       }
     }
   }
   ```

4. Save the file and reopen Claude Desktop.
5. Open a new chat → type `/mcp` and press Enter. `umami` should appear with
   status **connected** and 8 tools listed.

If it shows **failed**: check that the MCP server is running
(`curl http://127.0.0.1:3334/health` → `{"ok": true}`).

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "umami": {
      "url": "http://127.0.0.1:3334/mcp",
      "headers": {
        "X-Umami-Url": "https://umami.example.com",
        "X-Umami-Username": "youruser",
        "X-Umami-Password": "yourpass"
      }
    }
  }
}
```

### n8n

In an **AI Agent** workflow add the **MCP Client Tool** node:

- **Endpoint**: `http://127.0.0.1:3334/mcp` (or the container hostname if
  n8n runs in Docker, e.g. `http://umami-mcp:3334/mcp` on the same network).
- **Server Transport**: `HTTP Streamable`.
- **Headers**: add `X-Umami-Url`, `X-Umami-Username`, `X-Umami-Password`.

Connect the node to the `tools` input of the AI Agent. n8n introspects
`tools/list` automatically, so the 8 Umami tools become available to the
agent without further config.

### VS Code (Copilot Chat)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "umami": {
      "type": "http",
      "url": "http://127.0.0.1:3334/mcp",
      "headers": {
        "X-Umami-Url": "https://umami.example.com",
        "X-Umami-Username": "youruser",
        "X-Umami-Password": "yourpass"
      }
    }
  }
}
```

### MCP Inspector (debug)

```bash
npx @modelcontextprotocol/inspector
# Streamable HTTP → http://127.0.0.1:3334/mcp
# Add the X-Umami-* headers in the Inspector "Authentication" panel.
```

## Tools

| Tool | Purpose |
| --- | --- |
| `list_websites` | All websites the user can access. |
| `get_stats` | Pageviews / visitors / bounces with prev-period delta. |
| `get_pageviews` | Time-series, grouped by minute / hour / day / month. |
| `get_metrics` | Top-N by path, referrer, browser, country, event, UTM, … |
| `get_active_visitors` | Live visitor count. |
| `get_realtime_activity` | Pageviews + sessions + events from the last few minutes. |
| `list_sessions` | Paginated session list in a date range. |
| `get_session_activity` | Pageview/event timeline for a single session. |

## Example prompts

Marketing-oriented questions for the connected assistant:

- "Build me a Monday-morning report for **\<website>**: visitors, pageviews,
  bounce rate vs last week. Highlight anything that moved more than ±15 %."
- "Compare `utmSource=newsletter` vs `utmSource=linkedin` over the last 30
  days — which sends higher-quality traffic?"
- "Top 10 blog posts this month with bounce rate. Which need a rewrite?"
- "Top 20 referring domains in the last 30 days. Which are new vs a week ago?"
- "How many `webinar_signup` events in the last 14 days, broken down by UTM?"
- "Pick three sessions from yesterday that ended in a `signup` event and walk
  me through what those users did. What do they have in common?"
- "How many people are on the site right now and which pages?"
- "Based on the last 90 days, what are my top 3 marketing priorities? Be
  specific — name pages, channels, geographies."

## Configuration

| Env | Required | Default | |
| --- | --- | --- | --- |
| `MCP_PORT` | no | `3334` | TCP port. |
| `LOG_LEVEL` | no | `info` | One of `debug`, `info`, `warn`, `error`. |
| `UMAMI_URL_ALLOWLIST` | no | unset | Comma-separated origin allowlist for `X-Umami-Url`. When set, requests with non-matching URLs are rejected with `403`. Wildcards via `*` (one host segment). Example: `https://*.example.com,https://umami.acme.io`. |

Umami credentials are not configured via env — they are passed by each
client via `X-Umami-*` request headers. See [Authentication](#authentication).

## Operations

- **Logging**: structured JSON to stdout/stderr (`info`/`debug` → stdout,
  `warn`/`error` → stderr). One line per event, no header values logged.
  Tail with `docker logs -f umami-mcp`.
- **Healthcheck**: `GET /health` returns `{"ok": true, "version": "..."}`.
  Wired into the Dockerfile `HEALTHCHECK`.
- **Limits**: request bodies > 1 MB → `413`; outbound calls to Umami
  timeout after 15 s.
- **Security model**: server holds no credentials. Run multiple replicas
  behind a load balancer if needed — sessions are sticky via the
  `Mcp-Session-Id` header, so terminate sessions on the same backend
  (or accept that a reconnect re-initializes a session).
- **SSRF guard (public deployments)**: by default the server connects to
  any URL provided in `X-Umami-Url`. When exposing the server on a public
  network, set `UMAMI_URL_ALLOWLIST` to a comma-separated list of
  permitted origins (wildcards via `*`). Combine with a TLS-terminating
  reverse proxy and rate limiting before going public.
- **Image**: pin a digest in production (`ghcr.io/mittwald/umami-mcp@sha256:…`)
  rather than `:latest`.
- **Graceful shutdown**: `SIGTERM`/`SIGINT` close all open MCP sessions and
  drain in-flight requests before exit (10 s hard cap).

## Development

```bash
pnpm install
pnpm dev           # tsx watch
pnpm test          # 13 unit tests
pnpm test:live     # 8 live tests, needs UMAMI_* env
pnpm build         # tsc → dist/
```

All tools are read-only. Add a tool: extend `src/tools.ts`, add a unit test
in `tests/tools.test.ts`, add a live test in `tests/live/live.test.ts` that
asserts the actual response shape.
