import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { fetchConfig } from "../client.js";
import type { ClientConfig, ConfigServerResponse } from "../types.js";

const mockResponse: ConfigServerResponse = {
  name: "my-app",
  profiles: ["production"],
  label: "main",
  version: "abc12345",
  propertySources: [
    {
      name: "https://git/my-app-production.yml",
      source: { "app.key": "value" },
    },
  ],
};

let server: http.Server;
let serverPort: number;
let lastRequestPath = "";
let lastRequestHeaders: http.IncomingHttpHeaders = {};

function startServer(): Promise<number> {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      lastRequestPath = req.url ?? "";
      lastRequestHeaders = req.headers;

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

function makeConfig(overrides?: Partial<ClientConfig>): ClientConfig {
  return {
    enabled: true,
    uri: `http://localhost:${serverPort}`,
    name: "my-app",
    profile: "production",
    label: "main",
    failFast: false,
    retry: { enabled: false, maxAttempts: 1, interval: 10, multiplier: 1, maxInterval: 100 },
    requestTimeout: 10000,
    ...overrides,
  };
}

describe("fetchConfig", () => {
  beforeEach(async () => {
    lastRequestPath = "";
    lastRequestHeaders = {};
    serverPort = await startServer();
  });

  afterEach(async () => {
    await stopServer();
  });

  it("sends custom headers in fetch request", async () => {
    const config = makeConfig({
      headers: {
        "X-Custom-Header": "custom-value",
        "X-Another": "another-value",
      },
    });

    await fetchConfig(config);

    expect(lastRequestHeaders["x-custom-header"]).toBe("custom-value");
    expect(lastRequestHeaders["x-another"]).toBe("another-value");
  });

  it("uses configurable timeout", async () => {
    // Create a server that never responds
    const slowServer = http.createServer(() => {
      // intentionally never respond
    });

    const slowPort = await new Promise<number>((resolve) => {
      slowServer.listen(0, () => {
        const addr = slowServer.address();
        resolve(typeof addr === "object" && addr ? addr.port : 0);
      });
    });

    const config = makeConfig({
      uri: `http://localhost:${slowPort}`,
      requestTimeout: 100, // very short timeout
      failFast: true,
    });

    const start = Date.now();
    const result = fetchConfig(config);

    await expect(result).rejects.toThrow();
    const elapsed = Date.now() - start;
    // Should have timed out quickly (within ~500ms considering overhead)
    expect(elapsed).toBeLessThan(2000);

    await new Promise<void>((resolve) => slowServer.close(() => resolve()));
  });

  it("handles single profile in URL", async () => {
    const config = makeConfig({ profile: "production" });

    await fetchConfig(config);

    expect(lastRequestPath).toBe("/my-app/production/main");
  });

  it("handles multiple comma-separated profiles in URL", async () => {
    const config = makeConfig({ profile: "production,eu-west" });

    await fetchConfig(config);

    expect(lastRequestPath).toBe("/my-app/production,eu-west/main");
  });

  it("trims whitespace around profile segments", async () => {
    const config = makeConfig({ profile: "production , eu-west , debug" });

    await fetchConfig(config);

    expect(lastRequestPath).toBe("/my-app/production,eu-west,debug/main");
  });

  it("encodes special characters in profile segments while preserving commas", async () => {
    const config = makeConfig({ profile: "prod/v2,staging" });

    await fetchConfig(config);

    expect(lastRequestPath).toBe("/my-app/prod%2Fv2,staging/main");
  });

  it("merges custom headers with auth header", async () => {
    const config = makeConfig({
      auth: { user: "admin", pass: "secret" },
      headers: { "X-Trace-Id": "abc123" },
    });

    await fetchConfig(config);

    const expected = "Basic " + Buffer.from("admin:secret").toString("base64");
    expect(lastRequestHeaders["authorization"]).toBe(expected);
    expect(lastRequestHeaders["x-trace-id"]).toBe("abc123");
  });

  it("custom headers can override auth header", async () => {
    const config = makeConfig({
      auth: { user: "admin", pass: "secret" },
      headers: { Authorization: "Bearer my-token" },
    });

    await fetchConfig(config);

    expect(lastRequestHeaders["authorization"]).toBe("Bearer my-token");
  });
});
