/**
 * Minimal logger with a consistent prefix.
 * Keeps things simple -- no external logging dependency.
 * Respects SPRING_CLOUD_CONFIG_LOG_LEVEL env var (debug, info, warn, error).
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

function getLogLevel(): LogLevel {
  const level = (
    process.env.SPRING_CLOUD_CONFIG_LOG_LEVEL ?? "info"
  ).toLowerCase() as LogLevel;
  return level in LOG_LEVELS ? level : "info";
}

export interface Logger {
  debug: (msg: string) => void;
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

export function createLogger(scope: string): Logger {
  const prefix = `[@trueburn/spring-config-client:${scope}]`;

  const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVELS[level] >= LOG_LEVELS[getLogLevel()];
  };

  return {
    debug: (msg: string) => shouldLog("debug") && console.debug(`${prefix} ${msg}`),
    info: (msg: string) => shouldLog("info") && console.info(`${prefix} ${msg}`),
    warn: (msg: string) => shouldLog("warn") && console.warn(`${prefix} ${msg}`),
    error: (msg: string) => shouldLog("error") && console.error(`${prefix} ${msg}`),
  };
}
