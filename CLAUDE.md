# Project: @trueburn/spring-config-client

Spring Cloud Config Server client for Node.js / Next.js. Bootstraps remote configuration into `process.env` at startup.

## Key Constraints

- **Zero runtime dependencies.** Only Node.js built-ins (`fetch`, `Buffer`, `http`). Never add an external runtime dependency without explicit approval.
- **Existing env vars are never overwritten.** This is a security boundary. Secrets from Vault/K8s always take precedence over config server values.
- **Starter, not a library.** This package runs at boot, injects into `process.env`, and gets out of the way. Application code should never import this package to read config values.
- **No config files for the client itself.** All configuration is via `SPRING_CLOUD_CONFIG_*` env vars.

## Architecture

```
src/
  types.ts       — All TypeScript interfaces (ClientConfig, RetryConfig, etc.)
  config.ts      — Resolves ClientConfig from env vars (including custom headers, timeout)
  client.ts      — HTTP client: builds URL, sends fetch request to config server
  merge.ts       — Merges property sources into process.env (dot notation + UPPER_SNAKE)
  retry.ts       — Exponential backoff retry wrapper
  bootstrap.ts   — Main entry point: resolveConfig -> fetchConfig -> mergeAndInject
  register.ts    — Auto-bootstrap for Next.js instrumentation (import side-effect)
  logger.ts      — Minimal scoped logger (no external deps)
  index.ts       — Public API barrel export
```

## Build & Test

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # vitest (50 tests across 5 files)
npm run build      # tsup: dual CJS/ESM, declarations, sourcemaps
```

All four checks must pass before committing.

## Output Format

Dual CJS/ESM build via tsup. Two entry points:
- `.` (main) — `dist/index.js` / `dist/index.mjs`
- `./register` — `dist/register.js` / `dist/register.mjs`

## Branching

- `main` — latest stable, publishes `@latest` to npm
- `next` — prerelease / breaking changes, publishes `@next`
- `release/N.x` — maintenance patches for older majors, publishes `@release-N.x`

PRs for bug fixes and non-breaking features target `main`. Breaking changes target `next`.

## Testing Conventions

- Tests live in `src/__tests__/*.test.ts`
- Integration tests (bootstrap, client) use real HTTP servers on ephemeral ports — no mocking of `fetch`
- Unit tests (config, merge, retry) test pure functions with injected env objects
- Always clean up env vars in `afterEach` / `afterAll` to prevent test pollution

## Style

- TypeScript strict mode
- No `any` unless absolutely necessary
- ESLint + Prettier enforced
- No emojis in code or docs
