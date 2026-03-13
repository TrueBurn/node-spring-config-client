# TODO

Possible future additions based on competitive analysis and Spring Cloud Config Client feature parity.

## Proxy Support

Allow a custom `http.Agent` or `https.Agent` to be passed for requests through corporate proxies.

- Add `agent` field to `ClientConfig`
- Env var: `SPRING_CLOUD_CONFIG_PROXY_URL` or programmatic `agent` option
- `cloud-config-client` supports this via an `agent` option (since their v1.2.0)
- Common enterprise requirement where config servers sit behind network boundaries

## Self-Signed Certificate Support

Allow disabling TLS certificate verification for dev/staging environments with self-signed certs.

- Add `rejectUnauthorized` field to `ClientConfig`
- Env var: `SPRING_CLOUD_CONFIG_TLS_REJECT_UNAUTHORIZED=false`
- Requires switching from `fetch()` to `https.request()` or passing a custom agent with `rejectUnauthorized: false`
- `cloud-config-client` supports this via a `rejectUnauthorized` option

## Context Variable Substitution

Support `${VARIABLE:default}` placeholder resolution in property values, using `process.env` or a provided context object as the lookup source.

- `cloud-config-client` supports this since their v1.4.0
- Example: `key01: Hello ${NAME:World}!!!` resolves `NAME` from context
- Low priority -- most teams handle substitution server-side or via Helm templating

## Config Object API

Expose an optional `Config` object with `.get()` and `.toObject()` methods for consumers who prefer querying config programmatically rather than reading `process.env`.

- `cloud-config-client` uses this as their primary API pattern
- Our design philosophy is "starter, not library" so this is low priority
- Could be useful for edge cases where dot-notation keys are awkward in `process.env`
