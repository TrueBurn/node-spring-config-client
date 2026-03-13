/**
 * @trueburn/spring-config-client
 *
 * Spring Cloud Config Server client for Node.js / Next.js.
 * Bootstraps remote configuration into process.env at startup.
 *
 * ## Quick Start
 *
 * Set the following env vars in your K8s deployment / Helm chart:
 *
 * ```
 * SPRING_CLOUD_CONFIG_ENABLED=true
 * SPRING_CLOUD_CONFIG_URI=http://config-server:8888
 * SPRING_CLOUD_CONFIG_NAME=my-nextjs-app
 * SPRING_CLOUD_CONFIG_PROFILE=production
 * ```
 *
 * ### Next.js (instrumentation.ts)
 *
 * ```typescript
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     const { bootstrap } = require('@trueburn/spring-config-client');
 *     await bootstrap();
 *   }
 * }
 * ```
 *
 * ### Express / Fastify / any Node.js app
 *
 * ```typescript
 * import { bootstrap } from '@trueburn/spring-config-client';
 *
 * await bootstrap();
 * // process.env is now populated with remote config
 * ```
 *
 * @module
 */

export { bootstrap, _resetBootstrap } from "./bootstrap.js";
export { resolveConfig } from "./config.js";
export { fetchConfig } from "./client.js";
export { mergeAndInject, toUpperSnake } from "./merge.js";

export type {
  ClientConfig,
  RetryConfig,
  PropertySource,
  ConfigServerResponse,
  BootstrapResult,
} from "./types.js";
