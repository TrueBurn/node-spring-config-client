/**
 * Configuration options for the config client, resolved from environment variables.
 *
 * Environment variable mapping:
 *   SPRING_CLOUD_CONFIG_ENABLED       -- Enable/disable the client (default: false)
 *   SPRING_CLOUD_CONFIG_URI           -- Config server base URL (default: http://localhost:8888)
 *   SPRING_CLOUD_CONFIG_NAME          -- Application name (default: application)
 *   SPRING_CLOUD_CONFIG_PROFILE       -- Active profile(s), comma-separated (default: default)
 *   SPRING_CLOUD_CONFIG_LABEL         -- Git branch/label (default: main)
 *   SPRING_CLOUD_CONFIG_FAIL_FAST     -- Throw on fetch failure (default: false)
 *   SPRING_CLOUD_CONFIG_AUTH_USER     -- Basic auth username
 *   SPRING_CLOUD_CONFIG_AUTH_PASS     -- Basic auth password
 *   SPRING_CLOUD_CONFIG_RETRY_ENABLED -- Enable retry with backoff (default: false)
 *   SPRING_CLOUD_CONFIG_RETRY_MAX_ATTEMPTS   -- Max retry attempts (default: 5)
 *   SPRING_CLOUD_CONFIG_RETRY_INTERVAL       -- Initial retry interval in ms (default: 1000)
 *   SPRING_CLOUD_CONFIG_RETRY_MULTIPLIER     -- Backoff multiplier (default: 1.5)
 *   SPRING_CLOUD_CONFIG_RETRY_MAX_INTERVAL   -- Max retry interval in ms (default: 30000)
 *   SPRING_CLOUD_CONFIG_REQUEST_TIMEOUT      -- Request timeout in ms (default: 10000)
 *   SPRING_CLOUD_CONFIG_HEADERS_<NAME>       -- Custom headers (e.g. SPRING_CLOUD_CONFIG_HEADERS_AUTHORIZATION)
 */
export interface ClientConfig {
  /** Whether the config client is enabled */
  enabled: boolean;

  /** Config server base URL */
  uri: string;

  /** Application name used to resolve config on the server */
  name: string;

  /** Active profile(s), comma-separated (e.g. "production" or "production,eu-west") */
  profile: string;

  /** Git branch or label */
  label: string;

  /** If true, throw an error when the config server is unreachable */
  failFast: boolean;

  /** Basic auth credentials */
  auth?: {
    user: string;
    pass: string;
  };

  /** Retry configuration */
  retry: RetryConfig;

  /** Custom headers to send with the config server request */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds (default: 10000) */
  requestTimeout: number;
}

export interface RetryConfig {
  /** Whether retry is enabled */
  enabled: boolean;

  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Initial interval between retries in ms */
  interval: number;

  /** Multiplier applied to interval after each attempt */
  multiplier: number;

  /** Maximum interval between retries in ms */
  maxInterval: number;
}

/**
 * A single property source returned by the Spring Cloud Config Server.
 * Each source represents a config file (e.g. my-app-production.yml).
 */
export interface PropertySource {
  /** Source identifier (usually the file path in the git repo) */
  name: string;

  /** Flat key-value map of resolved properties (dot-notation keys) */
  source: Record<string, string | number | boolean>;
}

/**
 * The full response from the Config Server's /{name}/{profile}/{label} endpoint.
 */
export interface ConfigServerResponse {
  /** Application name */
  name: string;

  /** Active profiles */
  profiles: string[];

  /** Git label */
  label: string;

  /** Git version/commit hash */
  version?: string;

  /** State identifier */
  state?: string;

  /** Ordered property sources (most specific first) */
  propertySources: PropertySource[];
}

/**
 * Result of the bootstrap process.
 */
export interface BootstrapResult {
  /** Whether config was fetched successfully */
  success: boolean;

  /** Number of properties injected into process.env */
  propertiesInjected: number;

  /** Property sources that were loaded (names only) */
  sources: string[];

  /** Error if the bootstrap failed and failFast is false */
  error?: Error;
}
