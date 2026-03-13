import type { ClientConfig, ConfigServerResponse, PropertySource } from "./types.js";
import { withRetry } from "./retry.js";
import { createLogger } from "./logger.js";

const log = createLogger("client");

/**
 * Fetches configuration from the Spring Cloud Config Server.
 *
 * Calls: GET {uri}/{name}/{profile}/{label}
 *
 * Returns the ordered list of property sources (most specific first).
 * If the server is unreachable and failFast is false, returns an empty array.
 */
export async function fetchConfig(config: ClientConfig): Promise<PropertySource[]> {
  const url = buildUrl(config);

  log.info(`Fetching config from ${url}`);

  const doFetch = async (): Promise<PropertySource[]> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (config.auth) {
      const credentials = Buffer.from(
        `${config.auth.user}:${config.auth.pass}`
      ).toString("base64");
      headers["Authorization"] = `Basic ${credentials}`;
    }

    if (config.headers) {
      Object.assign(headers, config.headers);
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(config.requestTimeout),
    });

    if (!response.ok) {
      throw new Error(
        `Config server returned HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as ConfigServerResponse;

    log.info(
      `Received ${data.propertySources.length} property source(s) ` +
        `for ${data.name} [${data.profiles.join(", ")}]` +
        (data.version ? ` @ ${data.version.substring(0, 8)}` : "")
    );

    if (log.debug) {
      for (const source of data.propertySources) {
        const keyCount = Object.keys(source.source).length;
        log.debug(`  -> ${source.name} (${keyCount} properties)`);
      }
    }

    return data.propertySources;
  };

  try {
    return await withRetry(doFetch, config.retry);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    if (config.failFast) {
      log.error(`Failed to fetch config (fail-fast enabled): ${error.message}`);
      throw error;
    }

    log.warn(
      `Failed to fetch config (fail-fast disabled, continuing without remote config): ${error.message}`
    );
    return [];
  }
}

/**
 * Builds the config server URL.
 *
 * For multi-profile support, each profile segment is encoded individually
 * while commas are preserved (Spring Cloud Config Server expects unencoded commas).
 */
function buildUrl(config: ClientConfig): string {
  const base = config.uri.replace(/\/+$/, "");
  const profileEncoded = config.profile
    .split(",")
    .map((p) => encodeURIComponent(p.trim()))
    .join(",");
  return `${base}/${encodeURIComponent(config.name)}/${profileEncoded}/${encodeURIComponent(config.label)}`;
}
