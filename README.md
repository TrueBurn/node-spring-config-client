# @trueburn/spring-config-client

[![CI](https://github.com/trueburn/node-spring-config-client/actions/workflows/ci.yml/badge.svg)](https://github.com/trueburn/node-spring-config-client/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@trueburn/spring-config-client)](https://www.npmjs.com/package/@trueburn/spring-config-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Spring Cloud Config Server client for Node.js / Next.js.

Bootstraps remote configuration into `process.env` at startup -- so your non-JVM services consume config from the same Spring Cloud Config Server as your Spring Boot microservices.

## Why

Your Spring Boot services already use Spring Cloud Config Server for centralised configuration. When a non-JVM service (Next.js, Express, Fastify) joins the platform, you don't want config sprawl across Helm values and GitOps repos. This package lets Node.js apps pull config from the same server, using the same YAML files, with a single env var to enable it.

## Design Principles

- **Zero config files** -- configured entirely via env vars (no `bootstrap.yml`)
- **Existing env vars never overwritten** -- secrets from Vault/K8s always win
- **Dual key format** -- properties injected as both `app.database.host` and `APP_DATABASE_HOST`
- **Multiple profiles** -- comma-separated profiles supported (e.g. `production,eu-west`)
- **Custom headers** -- add arbitrary headers via env vars for auth tokens, tracing, etc.
- **No refresh** -- config is loaded once at startup; pod restart handles changes
- **No cipher support** -- secrets come from Vault/external secret operators, not the config server
- **Zero dependencies** -- uses only Node.js built-ins (`fetch`, `Buffer`, `http`)

## Installation

```bash
npm install @trueburn/spring-config-client
```

## Quick Start

### 1. Set env vars in your Helm chart / K8s deployment

```yaml
env:
  - name: SPRING_CLOUD_CONFIG_ENABLED
    value: "true"
  - name: SPRING_CLOUD_CONFIG_URI
    value: "http://config-server:8888"
  - name: SPRING_CLOUD_CONFIG_NAME
    value: "my-nextjs-app"
  - name: SPRING_CLOUD_CONFIG_PROFILE
    value: "production"
```

### 2a. Next.js -- instrumentation.ts

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrap } = require('@trueburn/spring-config-client');
    await bootstrap();
  }
}
```

Or use the auto-register shorthand:

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@trueburn/spring-config-client/register');
  }
}
```

### 2b. Express / Fastify / any Node.js app

```typescript
import { bootstrap } from '@trueburn/spring-config-client';

async function main() {
  await bootstrap();

  // process.env is now populated with remote config
  const app = express();
  app.listen(process.env.SERVER_PORT ?? 3000);
}

main();
```

### 3. Access config via process.env

Given this YAML in your config server's Git repo (`my-nextjs-app-production.yml`):

```yaml
app:
  database:
    host: "prod-db.internal"
    port: 5432
  feature:
    dark-mode: true
  api:
    base-url: "https://api.example.com"
```

Your code can access values in either format:

```typescript
// Dot notation (as-is from config server)
process.env["app.database.host"]      // "prod-db.internal"
process.env["app.feature.dark-mode"]  // "true"

// UPPER_SNAKE_CASE (standard env var convention)
process.env.APP_DATABASE_HOST         // "prod-db.internal"
process.env.APP_FEATURE_DARK_MODE     // "true"
process.env.APP_API_BASE_URL          // "https://api.example.com"
```

## Multiple Profiles

Spring Cloud Config Server supports multiple active profiles. Pass comma-separated profiles to load config from all of them:

```yaml
env:
  - name: SPRING_CLOUD_CONFIG_PROFILE
    value: "production,eu-west"
```

This generates a request to `GET /{name}/production,eu-west/{label}`. The config server returns property sources for all specified profiles, with earlier profiles taking precedence.

This matches Spring Boot's `spring.profiles.active=production,eu-west` behaviour.

## Custom Headers

Add custom HTTP headers to config server requests using the `SPRING_CLOUD_CONFIG_HEADERS_` prefix. This is useful for Bearer tokens, tracing headers, or any custom authentication mechanism.

**Naming convention:** Strip the prefix, replace underscores with hyphens, and title-case each segment.

```yaml
env:
  # Authorization: Bearer tok123
  - name: SPRING_CLOUD_CONFIG_HEADERS_AUTHORIZATION
    value: "Bearer tok123"

  # X-Custom-Header: my-value
  - name: SPRING_CLOUD_CONFIG_HEADERS_X_CUSTOM_HEADER
    value: "my-value"

  # X-Request-Id: trace-abc
  - name: SPRING_CLOUD_CONFIG_HEADERS_X_REQUEST_ID
    value: "trace-abc"
```

You can also pass headers programmatically:

```typescript
import { bootstrap } from '@trueburn/spring-config-client';

await bootstrap({
  headers: {
    Authorization: 'Bearer my-token',
    'X-Tenant-Id': 'acme',
  },
});
```

## Configurable Timeout

By default, requests to the config server time out after 10 seconds. You can adjust this:

```yaml
env:
  - name: SPRING_CLOUD_CONFIG_REQUEST_TIMEOUT
    value: "15000"  # 15 seconds
```

## Configuration Reference

All configuration is via environment variables. No config files needed.

| Env Var | Default | Description |
|---------|---------|-------------|
| `SPRING_CLOUD_CONFIG_ENABLED` | `false` | Enable/disable the client. Must be `true` to fetch config. |
| `SPRING_CLOUD_CONFIG_URI` | `http://localhost:8888` | Config server base URL |
| `SPRING_CLOUD_CONFIG_NAME` | `application` | Application name (maps to config file name) |
| `SPRING_CLOUD_CONFIG_PROFILE` | `default` | Active profile(s), comma-separated (e.g. `production,eu-west`) |
| `SPRING_CLOUD_CONFIG_LABEL` | `main` | Git branch/label |
| `SPRING_CLOUD_CONFIG_FAIL_FAST` | `false` | Throw on fetch failure (blocks startup) |
| `SPRING_CLOUD_CONFIG_AUTH_USER` | -- | Basic auth username |
| `SPRING_CLOUD_CONFIG_AUTH_PASS` | -- | Basic auth password |
| `SPRING_CLOUD_CONFIG_RETRY_ENABLED` | `false` | Enable retry with exponential backoff |
| `SPRING_CLOUD_CONFIG_RETRY_MAX_ATTEMPTS` | `5` | Max retry attempts |
| `SPRING_CLOUD_CONFIG_RETRY_INTERVAL` | `1000` | Initial retry interval (ms) |
| `SPRING_CLOUD_CONFIG_RETRY_MULTIPLIER` | `1.5` | Backoff multiplier |
| `SPRING_CLOUD_CONFIG_RETRY_MAX_INTERVAL` | `30000` | Max retry interval (ms) |
| `SPRING_CLOUD_CONFIG_REQUEST_TIMEOUT` | `10000` | Request timeout (ms) |
| `SPRING_CLOUD_CONFIG_HEADERS_<NAME>` | -- | Custom header (e.g. `_AUTHORIZATION` becomes `Authorization`) |
| `SPRING_CLOUD_CONFIG_LOG_LEVEL` | `info` | Log level: debug, info, warn, error, silent |

## Precedence

Properties are resolved in this order (highest to lowest):

1. **Existing env vars** -- from Vault, K8s ConfigMaps, external secret operators, etc. These are **never** overwritten.
2. **Most specific profile** -- e.g. `my-nextjs-app-production.yml`
3. **Application defaults** -- e.g. `my-nextjs-app.yml`
4. **Global defaults** -- e.g. `application.yml`

This matches Spring Boot's property resolution order.

## Key Format

Each property from the config server is injected in two formats:

| Config Server Key | Dot notation (injected) | UPPER_SNAKE (injected) |
|---|---|---|
| `app.database.host` | `app.database.host` | `APP_DATABASE_HOST` |
| `app.feature.dark-mode` | `app.feature.dark-mode` | `APP_FEATURE_DARK_MODE` |
| `app.list[0].name` | `app.list[0].name` | `APP_LIST_0_NAME` |

## Feature Parity with Spring Cloud Config Client

Comparison with the official [Spring Cloud Config Client](https://docs.spring.io/spring-cloud-config/reference/client.html):

| Feature | Status | Notes |
|---------|--------|-------|
| Bootstrap config from server | Supported | `GET /{name}/{profile}/{label}` |
| Multiple profiles | Supported | Comma-separated, e.g. `production,eu-west` |
| Basic authentication | Supported | Via `AUTH_USER` / `AUTH_PASS` env vars |
| Custom headers | Supported | Via `HEADERS_*` env vars or programmatic |
| Retry with exponential backoff | Supported | Configurable max attempts, interval, multiplier |
| Fail-fast mode | Supported | Blocks startup if config server is unreachable |
| Property source precedence | Supported | Most specific profile wins |
| Configurable timeout | Supported | Via `REQUEST_TIMEOUT` env var |
| Config-first bootstrap | Supported | Call `bootstrap()` before app starts |
| Discovery-first bootstrap | Not Planned | Use config server URL directly |
| Vault backend | Not Applicable | Secrets come from K8s/Vault directly |
| Config encryption/decryption | Not Planned | Use external secret operators |
| Dynamic refresh (`@RefreshScope`) | Not Planned | Pod restart handles config changes |
| Health indicator | Not Planned | Use K8s liveness/readiness probes |
| Spring Cloud Bus | Not Applicable | No JVM runtime |
| Composite environment repos | Supported | Server-side; client receives merged sources |

## Alternatives

There are several Node.js clients for Spring Cloud Config Server on npm. Here's how they compare:

| | @trueburn/spring-config-client | cloud-config-client | Others |
|---|---|---|---|
| **Last updated** | 2026 | 2022 | 2018--2020 |
| **Weekly downloads** | New | ~7,400 | 0--850 |
| **Runtime deps** | 0 | 0 | 1--4 (axios, rxjs, lodash) |
| **TypeScript** | Native (source is TS) | Hand-written .d.ts | Mostly none |
| **ESM + CJS** | Both | CJS only | CJS only |
| **Node.js** | >= 18 | >= 10 | Varies |
| **Pattern** | Starter (injects into process.env) | Library (.get() API) | Library |
| **Config via env vars** | Yes | No (programmatic only) | Varies |
| **process.env injection** | Automatic | Manual | No |
| **Next.js integration** | Dedicated entry point | No | No |
| **Retry with backoff** | Yes | No | No |
| **Fail-fast mode** | Yes | No | No |
| **Request timeout** | Configurable | No | No |
| **Multiple profiles** | Yes | Yes | Varies |
| **Basic auth** | Yes | Yes | Yes |
| **Custom headers** | Yes | Yes (since 1.5.0) | No |
| **Proxy support** | Not yet | Yes | No |
| **Self-signed certs** | Not yet | Yes | No |
| **Context substitution** | No | Yes | No |

**Key difference:** `cloud-config-client` is a *library* -- you call `client.load()` and query a `Config` object. This package is a *starter* -- call `bootstrap()` (or import `register`) and your config is in `process.env`. If you need a config object API, use `cloud-config-client`. If you want Spring Boot-style bootstrap behaviour with retry, fail-fast, and env var configuration, use this package.

## Programmatic API

If you need more control, the individual components are exported:

```typescript
import {
  bootstrap,        // Main entry point
  resolveConfig,    // Read client config from env vars
  fetchConfig,      // Fetch property sources from config server
  mergeAndInject,   // Merge sources into process.env
  toUpperSnake,     // Convert dot.notation to UPPER_SNAKE
} from '@trueburn/spring-config-client';

// Example: fetch without injecting
const config = resolveConfig();
const sources = await fetchConfig(config);
const flat = Object.fromEntries(
  sources.flatMap(s => Object.entries(s.source))
);
```

## Development

```bash
npm install
npm test          # Run tests
npm run build     # Build for publishing
npm run typecheck # Type-check without emitting
npm run lint      # Lint source files
npm run format    # Format source files
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
