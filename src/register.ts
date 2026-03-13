/**
 * Auto-bootstrap entry point for Next.js instrumentation.
 *
 * Usage in your Next.js project's instrumentation.ts:
 *
 * ```typescript
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     await import('@trueburn/spring-config-client/register');
 *   }
 * }
 * ```
 *
 * This module calls bootstrap() on import, so simply importing it
 * is enough to load remote config into process.env.
 *
 * The default export is a promise that resolves when bootstrap completes,
 * which allows `await import(...)` to wait for the config to be loaded.
 */

import { bootstrap } from "./bootstrap.js";

const promise = bootstrap().then((result) => {
  if (!result.success && result.error) {
    throw result.error;
  }
  return result;
});

export default promise;
