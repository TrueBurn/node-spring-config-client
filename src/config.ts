import type { ClientConfig } from "./types.js";

/**
 * Resolves the client configuration from environment variables.
 *
 * Uses the SPRING_CLOUD_CONFIG_* prefix to stay consistent with
 * Spring Boot conventions -- teams set the same env var names
 * regardless of whether the service is JVM or Node.
 */
export function resolveConfig(env: Record<string, string | undefined> = process.env): ClientConfig {
  const auth = env.SPRING_CLOUD_CONFIG_AUTH_USER
    ? {
        user: env.SPRING_CLOUD_CONFIG_AUTH_USER,
        pass: env.SPRING_CLOUD_CONFIG_AUTH_PASS ?? "",
      }
    : undefined;

  return {
    enabled: envBool(env, "SPRING_CLOUD_CONFIG_ENABLED", false),
    uri: env.SPRING_CLOUD_CONFIG_URI ?? "http://localhost:8888",
    name: env.SPRING_CLOUD_CONFIG_NAME ?? "application",
    profile: env.SPRING_CLOUD_CONFIG_PROFILE ?? "default",
    label: env.SPRING_CLOUD_CONFIG_LABEL ?? "main",
    failFast: envBool(env, "SPRING_CLOUD_CONFIG_FAIL_FAST", false),
    auth,
    retry: {
      enabled: envBool(env, "SPRING_CLOUD_CONFIG_RETRY_ENABLED", false),
      maxAttempts: envInt(env, "SPRING_CLOUD_CONFIG_RETRY_MAX_ATTEMPTS", 5),
      interval: envInt(env, "SPRING_CLOUD_CONFIG_RETRY_INTERVAL", 1000),
      multiplier: envFloat(env, "SPRING_CLOUD_CONFIG_RETRY_MULTIPLIER", 1.5),
      maxInterval: envInt(env, "SPRING_CLOUD_CONFIG_RETRY_MAX_INTERVAL", 30000),
    },
    headers: parseHeaders(env),
    requestTimeout: envInt(env, "SPRING_CLOUD_CONFIG_REQUEST_TIMEOUT", 10000),
  };
}

/**
 * Parses custom headers from SPRING_CLOUD_CONFIG_HEADERS_* env vars.
 *
 * Strips the prefix, replaces underscores with hyphens, and title-cases each segment.
 *
 * Examples:
 *   SPRING_CLOUD_CONFIG_HEADERS_AUTHORIZATION=Bearer tok → { Authorization: "Bearer tok" }
 *   SPRING_CLOUD_CONFIG_HEADERS_X_CUSTOM_HEADER=val     → { "X-Custom-Header": "val" }
 */
function parseHeaders(
  env: Record<string, string | undefined>
): Record<string, string> | undefined {
  const prefix = "SPRING_CLOUD_CONFIG_HEADERS_";
  const headers: Record<string, string> = {};
  let hasHeaders = false;

  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith(prefix) && value !== undefined && value !== "") {
      const headerName = key
        .substring(prefix.length)
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join("-");
      headers[headerName] = value;
      hasHeaders = true;
    }
  }

  return hasHeaders ? headers : undefined;
}

function envBool(
  env: Record<string, string | undefined>,
  key: string,
  defaultValue: boolean
): boolean {
  const val = env[key];
  if (val === undefined || val === "") return defaultValue;
  return val.toLowerCase() === "true";
}

function envInt(
  env: Record<string, string | undefined>,
  key: string,
  defaultValue: number
): number {
  const val = env[key];
  if (val === undefined || val === "") return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function envFloat(
  env: Record<string, string | undefined>,
  key: string,
  defaultValue: number
): number {
  const val = env[key];
  if (val === undefined || val === "") return defaultValue;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultValue : parsed;
}
