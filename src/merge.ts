import type { PropertySource } from "./types.js";
import { createLogger } from "./logger.js";

const log = createLogger("merge");

/**
 * Merges property sources and injects them into process.env.
 *
 * Precedence (highest to lowest):
 *   1. Existing env vars (VSO secrets, K8s ConfigMaps, etc.) -- NEVER overwritten
 *   2. Most specific property source (first in the array from config server)
 *   3. Less specific property sources
 *
 * For each property, both formats are injected:
 *   - Dot notation as-is:     "app.database.host"
 *   - UPPER_SNAKE_CASE:       "APP_DATABASE_HOST"
 *
 * Returns the number of new properties injected.
 */
export function mergeAndInject(
  sources: PropertySource[],
  env: Record<string, string | undefined> = process.env
): number {
  // Merge sources: most specific first -> iterate in order, first write wins
  const merged = new Map<string, string>();

  for (const source of sources) {
    for (const [key, value] of Object.entries(source.source)) {
      if (!merged.has(key)) {
        merged.set(key, String(value));
      }
    }
  }

  log.info(`Merged ${merged.size} unique properties from ${sources.length} source(s)`);

  let injected = 0;

  for (const [dotKey, value] of merged) {
    const snakeKey = toUpperSnake(dotKey);

    // Dot notation -- only if not already set
    if (injectIfAbsent(env, dotKey, value)) {
      injected++;
    }

    // UPPER_SNAKE -- only if different from dot key and not already set
    if (snakeKey !== dotKey) {
      if (injectIfAbsent(env, snakeKey, value)) {
        injected++;
      }
    }
  }

  log.info(`Injected ${injected} new entries into process.env`);

  return injected;
}

/**
 * Injects a value into the env object only if the key is not already set.
 * Returns true if the value was injected, false if it was skipped.
 */
function injectIfAbsent(
  env: Record<string, string | undefined>,
  key: string,
  value: string
): boolean {
  if (env[key] !== undefined && env[key] !== "") {
    log.debug(`Skipping "${key}" -- already set in environment`);
    return false;
  }
  env[key] = value;
  return true;
}

/**
 * Converts a dot-notation or kebab-case property key to UPPER_SNAKE_CASE.
 *
 * Examples:
 *   "app.database.host"      -> "APP_DATABASE_HOST"
 *   "app.feature.dark-mode"  -> "APP_FEATURE_DARK_MODE"
 *   "server.port"            -> "SERVER_PORT"
 *   "app.list[0].name"       -> "APP_LIST_0_NAME"
 */
export function toUpperSnake(key: string): string {
  return key
    .replace(/[.-]/g, "_")     // dots and hyphens -> underscores
    .replace(/\[(\d+)\]/g, "_$1") // array notation [0] -> _0
    .replace(/_+/g, "_")       // collapse multiple underscores
    .replace(/^_|_$/g, "")     // trim leading/trailing underscores
    .toUpperCase();
}
