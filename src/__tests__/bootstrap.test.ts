import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import http from "node:http";
import { bootstrap, _resetBootstrap } from "../bootstrap.js";
import type { ConfigServerResponse } from "../types.js";

// --- Mock Config Server ---

const mockResponse: ConfigServerResponse = {
  name: "my-nextjs-app",
  profiles: ["production"],
  label: "main",
  version: "abc12345",
  propertySources: [
    {
      name: "https://git/my-nextjs-app-production.yml",
      source: {
        "app.database.host": "prod-db.internal",
        "app.database.port": 5432,
        "app.feature.dark-mode": true,
        "app.api.base-url": "https://api.example.com",
      },
    },
    {
      name: "https://git/my-nextjs-app.yml",
      source: {
        "app.database.host": "default-db",
        "app.database.port": 3306,
        "app.database.name": "myapp",
        "app.log.level": "info",
      },
    },
  ],
};

let server: http.Server;
let serverPort: number;
let requestCount = 0;
let lastRequestPath = "";
let lastAuthHeader = "";
let lastRequestHeaders: http.IncomingHttpHeaders = {};
let shouldFail = false;

function startServer(): Promise<number> {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      requestCount++;
      lastRequestPath = req.url ?? "";
      lastAuthHeader = req.headers.authorization ?? "";
      lastRequestHeaders = req.headers;

      if (shouldFail) {
        res.writeHead(503);
        res.end("Service Unavailable");
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(mockResponse));
    });

    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve(port);
    });
  });
}

function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

// --- Env helpers ---

const originalEnv = { ...process.env };

function cleanEnv() {
  // Remove all keys we might have injected
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith("app.") ||
      key.startsWith("APP_") ||
      key.startsWith("SPRING_CLOUD_CONFIG_")
    ) {
      delete process.env[key];
    }
  }
}

// --- Tests ---

describe("bootstrap integration", () => {
  beforeEach(async () => {
    cleanEnv();
    _resetBootstrap();
    requestCount = 0;
    lastRequestPath = "";
    lastAuthHeader = "";
    lastRequestHeaders = {};
    shouldFail = false;
    serverPort = await startServer();
  });

  afterEach(async () => {
    await stopServer();
    cleanEnv();
  });

  afterAll(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
  });

  it("skips when not enabled", async () => {
    const result = await bootstrap({
      enabled: false,
      uri: `http://localhost:${serverPort}`,
    });

    expect(result.success).toBe(true);
    expect(result.propertiesInjected).toBe(0);
    expect(requestCount).toBe(0);
  });

  it("fetches config and injects into process.env", async () => {
    const result = await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production",
      label: "main",
      failFast: false,
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    expect(result.success).toBe(true);
    expect(result.propertiesInjected).toBeGreaterThan(0);
    expect(result.sources).toHaveLength(2);

    // Check dot notation
    expect(process.env["app.database.host"]).toBe("prod-db.internal");
    expect(process.env["app.database.port"]).toBe("5432");
    expect(process.env["app.feature.dark-mode"]).toBe("true");
    expect(process.env["app.api.base-url"]).toBe("https://api.example.com");

    // Check UPPER_SNAKE
    expect(process.env["APP_DATABASE_HOST"]).toBe("prod-db.internal");
    expect(process.env["APP_DATABASE_PORT"]).toBe("5432");
    expect(process.env["APP_FEATURE_DARK_MODE"]).toBe("true");
    expect(process.env["APP_API_BASE_URL"]).toBe("https://api.example.com");

    // Check precedence: production source wins over default
    expect(process.env["app.database.host"]).toBe("prod-db.internal");
    // Key only in default source still present
    expect(process.env["app.database.name"]).toBe("myapp");
    expect(process.env["app.log.level"]).toBe("info");
  });

  it("never overwrites existing env vars", async () => {
    process.env["APP_DATABASE_HOST"] = "vso-secret";
    process.env["app.database.host"] = "existing-dot";

    await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production",
      label: "main",
      failFast: false,
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    expect(process.env["APP_DATABASE_HOST"]).toBe("vso-secret");
    expect(process.env["app.database.host"]).toBe("existing-dot");
  });

  it("calls the correct URL path", async () => {
    await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production",
      label: "main",
      failFast: false,
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    expect(lastRequestPath).toBe("/my-nextjs-app/production/main");
  });

  it("sends basic auth header when credentials are set", async () => {
    await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production",
      label: "main",
      failFast: false,
      auth: { user: "admin", pass: "secret" },
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    const expected = "Basic " + Buffer.from("admin:secret").toString("base64");
    expect(lastAuthHeader).toBe(expected);
  });

  it("returns failure with error when failFast is true and server fails", async () => {
    shouldFail = true;

    const result = await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production",
      label: "main",
      failFast: true,
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    expect(result.success).toBe(false);
    expect(result.propertiesInjected).toBe(0);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain("503");
  });

  it("returns success with 0 properties when failFast is false and server fails", async () => {
    shouldFail = true;

    const result = await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production",
      label: "main",
      failFast: false,
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    expect(result.success).toBe(true);
    expect(result.propertiesInjected).toBe(0);
  });

  it("prevents duplicate bootstrap calls", async () => {
    await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production",
      label: "main",
      failFast: false,
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    const secondResult = await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production",
      label: "main",
      failFast: false,
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    expect(requestCount).toBe(1);
    expect(secondResult.propertiesInjected).toBe(0);
  });

  it("passes custom headers through to fetch", async () => {
    await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production",
      label: "main",
      failFast: false,
      headers: { "X-Request-Id": "test-123", "X-Tenant": "acme" },
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    expect(lastRequestHeaders["x-request-id"]).toBe("test-123");
    expect(lastRequestHeaders["x-tenant"]).toBe("acme");
  });

  it("bootstrap with multiple profiles builds correct URL", async () => {
    await bootstrap({
      enabled: true,
      uri: `http://localhost:${serverPort}`,
      name: "my-nextjs-app",
      profile: "production,eu-west",
      label: "main",
      failFast: false,
      requestTimeout: 10000,
      retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    });

    expect(lastRequestPath).toBe("/my-nextjs-app/production,eu-west/main");
  });
});
