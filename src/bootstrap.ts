import type { BootstrapResult, ClientConfig } from "./types.js";
import { resolveConfig } from "./config.js";
import { fetchConfig } from "./client.js";
import { mergeAndInject } from "./merge.js";
import { createLogger } from "./logger.js";

const log = createLogger("bootstrap");

let _bootstrapped = false;

/**
 * Bootstraps the application by fetching remote config from the
 * Spring Cloud Config Server and injecting it into process.env.
 *
 * This should be called as early as possible in the application lifecycle.
 * For Next.js, call it in `instrumentation.ts` inside the `register()` function.
 * For Express/Fastify, call it before starting the HTTP server.
 *
 * If SPRING_CLOUD_CONFIG_ENABLED is not "true", this is a no-op.
 *
 * Existing env vars (from VSO, K8s ConfigMaps, etc.) are never overwritten.
 *
 * @param overrides - Optional partial config to override env-based resolution (useful for testing)
 * @returns Result of the bootstrap process
 *
 * @example
 * ```typescript
 * // Next.js instrumentation.ts
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     const { bootstrap } = require('@trueburn/spring-config-client');
 *     await bootstrap();
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Express / Fastify
 * import { bootstrap } from '@trueburn/spring-config-client';
 *
 * async function main() {
 *   await bootstrap();
 *   // process.env now has remote config
 *   const app = express();
 *   app.listen(process.env.SERVER_PORT ?? 3000);
 * }
 * main();
 * ```
 */
export async function bootstrap(
  overrides?: Partial<ClientConfig>
): Promise<BootstrapResult> {
  const config = { ...resolveConfig(), ...overrides };

  if (!config.enabled) {
    log.info("Config client is disabled (SPRING_CLOUD_CONFIG_ENABLED != true). Skipping.");
    return {
      success: true,
      propertiesInjected: 0,
      sources: [],
    };
  }

  if (_bootstrapped) {
    log.warn("Bootstrap has already been called. Skipping duplicate invocation.");
    return {
      success: true,
      propertiesInjected: 0,
      sources: [],
    };
  }

  log.info(
    `Bootstrapping config for "${config.name}" ` +
      `[profile=${config.profile}, label=${config.label}] ` +
      `from ${config.uri}`
  );

  try {
    const sources = await fetchConfig(config);

    if (sources.length === 0) {
      log.warn("No property sources returned from config server.");
      _bootstrapped = true;
      return {
        success: true,
        propertiesInjected: 0,
        sources: [],
      };
    }

    const propertiesInjected = mergeAndInject(sources);
    _bootstrapped = true;

    log.info("Bootstrap complete.");

    return {
      success: true,
      propertiesInjected,
      sources: sources.map((s) => s.name),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    // If failFast is true, fetchConfig already threw -- this re-throws
    // If failFast is false, fetchConfig returned [] -- so we won't get here
    // But just in case of unexpected errors:
    log.error(`Bootstrap failed: ${error.message}`);

    return {
      success: false,
      propertiesInjected: 0,
      sources: [],
      error,
    };
  }
}

/**
 * Resets the bootstrap state. Only useful for testing.
 */
export function _resetBootstrap(): void {
  _bootstrapped = false;
}
