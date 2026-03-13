import type { RetryConfig } from "./types.js";
import { createLogger } from "./logger.js";

const log = createLogger("retry");

/**
 * Executes an async function with exponential backoff retry.
 *
 * The interval doubles (x multiplier) after each attempt, capped at maxInterval.
 * If all attempts fail, the last error is thrown.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  if (!config.enabled) {
    return fn();
  }

  let lastError: Error | undefined;
  let currentInterval = config.interval;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === config.maxAttempts) {
        log.error(
          `All ${config.maxAttempts} attempts failed. Last error: ${lastError.message}`
        );
        break;
      }

      log.warn(
        `Attempt ${attempt}/${config.maxAttempts} failed: ${lastError.message}. ` +
          `Retrying in ${currentInterval}ms...`
      );

      await sleep(currentInterval);
      currentInterval = Math.min(
        currentInterval * config.multiplier,
        config.maxInterval
      );
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
