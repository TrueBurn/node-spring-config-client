# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-13

### Added

- Bootstrap remote config from Spring Cloud Config Server into `process.env`
- Dual key format injection (dot notation + UPPER_SNAKE_CASE)
- Multiple profiles support (comma-separated, e.g. `production,eu-west`)
- Custom HTTP headers via `SPRING_CLOUD_CONFIG_HEADERS_*` env vars
- Configurable request timeout via `SPRING_CLOUD_CONFIG_REQUEST_TIMEOUT`
- Basic authentication support
- Retry with exponential backoff
- Fail-fast mode
- Auto-register entry point for Next.js (`@trueburn/spring-config-client/register`)
- Dual ESM/CJS output with TypeScript declarations
- Zero runtime dependencies
