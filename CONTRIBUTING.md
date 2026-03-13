# Contributing to @trueburn/spring-config-client

Thanks for your interest in contributing! This project aims to be a reliable, minimal bridge between Spring Cloud Config Server and the Node.js ecosystem.

## Getting Started

```bash
git clone https://github.com/trueburn/node-spring-config-client.git
cd node-spring-config-client
npm install
npm test
```

## Development Workflow

1. Fork the repository
2. Create a feature branch from the appropriate base branch (see [Branching Strategy](#branching-strategy))
3. Make your changes
4. Ensure all tests pass (`npm test`)
5. Ensure types are correct (`npm run typecheck`)
6. Ensure linting passes (`npm run lint`)
7. Ensure the build succeeds (`npm run build`)
8. Commit with a clear message
9. Open a pull request against the appropriate base branch

## Branching Strategy

This project uses a three-branch model to support stable releases, prereleases, and maintenance patches simultaneously.

### Branches

| Branch | Purpose | npm dist-tag | Example version |
|--------|---------|-------------|-----------------|
| `main` | Latest stable release | `@latest` | `1.2.0` |
| `next` | Prerelease / breaking changes in progress | `@next` | `2.0.0-rc.0` |
| `release/N.x` | Maintenance patches for older majors | `@release-N.x` | `1.2.1` |

### Which branch do I target?

- **Bug fix or non-breaking feature** -- PR against `main`
- **Breaking change or new major version work** -- PR against `next`
- **Hotfix for an older major version** -- PR against the relevant `release/N.x` branch

### Release lifecycle

```
main    ──●(1.2.0)──●(1.2.1 hotfix)──────────────●(merge next -> 2.0.0)──
                \                                 /
next             └──●(2.0.0-rc.0)──●(2.0.0-rc.1)┘
                                                   \
release/1.x                                         └──●(1.2.2 if needed)
```

1. **Stable work** happens on `main`. Bumping `package.json` and merging to `main` publishes as `@latest`.
2. **Breaking changes** happen on `next`. Each push publishes as `@next` (e.g. `npm i @trueburn/spring-config-client@next`).
3. **Hotfixes to the current stable** go directly to `main`, even while `next` has breaking changes in progress.
4. **When the next major is ready**, `next` is merged into `main` and a stable version (e.g. `2.0.0`) is published as `@latest`.
5. **Post-major hotfixes** for the old major: cut a `release/N.x` branch from the last tag of that major (e.g. `release/1.x` from `v1.2.1`). Patches publish as `@release-1.x`.

### Version bumping

- Stable: `1.2.0`, `1.3.0`, `2.0.0`
- Prerelease: `2.0.0-rc.0`, `2.0.0-rc.1`, `2.0.0-beta.1`
- The CI automatically determines the npm dist-tag from the branch name. You only need to bump the version in `package.json`.

## Design Principles

Before contributing, please understand the core design constraints:

- **Zero runtime dependencies.** We use only Node.js built-ins. If your change needs an external package, there needs to be a very strong justification.
- **Existing env vars are never overwritten.** This is a security boundary, not a preference. Secrets from Vault/K8s must always win.
- **No config files for the client itself.** The client is configured entirely via `SPRING_CLOUD_CONFIG_*` env vars.
- **Starter, not a library.** The package runs at boot, injects into `process.env`, and gets out of the way. Application code should never import this package to read config values.

## Adding Tests

All changes should include tests. The test structure is:

- `src/__tests__/config.test.ts` -- Env var resolution
- `src/__tests__/client.test.ts` -- HTTP client and URL building
- `src/__tests__/merge.test.ts` -- Property merging and injection
- `src/__tests__/retry.test.ts` -- Retry logic
- `src/__tests__/bootstrap.test.ts` -- Integration tests with a mock HTTP server

Run tests with:

```bash
npm test           # Single run
npm run test:watch # Watch mode
```

## Code Style

- TypeScript strict mode
- No `any` types unless absolutely necessary
- Prefer explicit return types on exported functions
- Keep files focused -- one concern per module

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for comma-separated profiles
fix: handle empty property source arrays gracefully
docs: clarify precedence model in README
test: add edge case for hyphenated keys
```

## Reporting Issues

When filing an issue, please include:

- Node.js version
- Spring Cloud Config Server version
- The env vars you've set (redact sensitive values)
- Expected vs actual behaviour
- Relevant log output (set `SPRING_CLOUD_CONFIG_LOG_LEVEL=debug`)

## Licence

By contributing, you agree that your contributions will be licensed under the MIT licence.
