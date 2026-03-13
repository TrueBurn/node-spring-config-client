import { describe, it, expect, beforeEach } from "vitest";
import { mergeAndInject, toUpperSnake } from "../merge.js";
import type { PropertySource } from "../types.js";

describe("toUpperSnake", () => {
  it("converts dot notation to UPPER_SNAKE", () => {
    expect(toUpperSnake("app.database.host")).toBe("APP_DATABASE_HOST");
  });

  it("converts hyphens to underscores", () => {
    expect(toUpperSnake("app.feature.dark-mode")).toBe("APP_FEATURE_DARK_MODE");
  });

  it("handles mixed dots and hyphens", () => {
    expect(toUpperSnake("app.my-service.connection-pool.max-size")).toBe(
      "APP_MY_SERVICE_CONNECTION_POOL_MAX_SIZE"
    );
  });

  it("handles array notation", () => {
    expect(toUpperSnake("app.list[0].name")).toBe("APP_LIST_0_NAME");
  });

  it("handles simple keys", () => {
    expect(toUpperSnake("server.port")).toBe("SERVER_PORT");
  });

  it("handles single-segment keys", () => {
    expect(toUpperSnake("port")).toBe("PORT");
  });

  it("handles already UPPER_SNAKE keys", () => {
    expect(toUpperSnake("APP_DATABASE_HOST")).toBe("APP_DATABASE_HOST");
  });
});

describe("mergeAndInject", () => {
  let env: Record<string, string | undefined>;

  beforeEach(() => {
    env = {};
  });

  it("injects properties in both dot and UPPER_SNAKE formats", () => {
    const sources: PropertySource[] = [
      {
        name: "app-production.yml",
        source: {
          "app.database.host": "db.example.com",
          "app.database.port": 5432,
        },
      },
    ];

    mergeAndInject(sources, env);

    expect(env["app.database.host"]).toBe("db.example.com");
    expect(env["APP_DATABASE_HOST"]).toBe("db.example.com");
    expect(env["app.database.port"]).toBe("5432");
    expect(env["APP_DATABASE_PORT"]).toBe("5432");
  });

  it("never overwrites existing env vars", () => {
    env["APP_DATABASE_HOST"] = "vso-secret-host";
    env["app.database.host"] = "existing-dot-value";

    const sources: PropertySource[] = [
      {
        name: "app-production.yml",
        source: {
          "app.database.host": "remote-host",
        },
      },
    ];

    mergeAndInject(sources, env);

    expect(env["APP_DATABASE_HOST"]).toBe("vso-secret-host");
    expect(env["app.database.host"]).toBe("existing-dot-value");
  });

  it("respects property source precedence (first source wins)", () => {
    const sources: PropertySource[] = [
      {
        name: "app-production.yml",
        source: {
          "app.database.host": "production-host",
          "app.database.port": 5432,
        },
      },
      {
        name: "app.yml",
        source: {
          "app.database.host": "default-host",
          "app.database.port": 3306,
          "app.database.name": "mydb",
        },
      },
    ];

    mergeAndInject(sources, env);

    // Most specific source (first) wins for overlapping keys
    expect(env["app.database.host"]).toBe("production-host");
    expect(env["app.database.port"]).toBe("5432");
    // Key only in less specific source still gets injected
    expect(env["app.database.name"]).toBe("mydb");
  });

  it("only overwrites UPPER_SNAKE if dot notation was also new", () => {
    // If VSO set the UPPER_SNAKE version, it should be preserved
    // even if dot notation doesn't exist
    env["APP_SECRET_KEY"] = "from-vso";

    const sources: PropertySource[] = [
      {
        name: "app.yml",
        source: {
          "app.secret.key": "from-config-server",
        },
      },
    ];

    mergeAndInject(sources, env);

    // Dot notation gets injected (it was absent)
    expect(env["app.secret.key"]).toBe("from-config-server");
    // UPPER_SNAKE preserved from VSO
    expect(env["APP_SECRET_KEY"]).toBe("from-vso");
  });

  it("returns the count of injected properties", () => {
    const sources: PropertySource[] = [
      {
        name: "app.yml",
        source: {
          "app.a": "1",
          "app.b": "2",
        },
      },
    ];

    // 2 keys x 2 formats = 4 injected
    const count = mergeAndInject(sources, env);
    expect(count).toBe(4);
  });

  it("returns 0 when all keys already exist", () => {
    env["app.a"] = "existing";
    env["APP_A"] = "existing";

    const sources: PropertySource[] = [
      {
        name: "app.yml",
        source: { "app.a": "new" },
      },
    ];

    const count = mergeAndInject(sources, env);
    expect(count).toBe(0);
  });

  it("handles empty sources gracefully", () => {
    const count = mergeAndInject([], env);
    expect(count).toBe(0);
  });

  it("converts non-string values to strings", () => {
    const sources: PropertySource[] = [
      {
        name: "app.yml",
        source: {
          "app.enabled": true,
          "app.count": 42,
          "app.rate": 0.75,
        },
      },
    ];

    mergeAndInject(sources, env);

    expect(env["app.enabled"]).toBe("true");
    expect(env["app.count"]).toBe("42");
    expect(env["app.rate"]).toBe("0.75");
  });
});
