import { describe, it, expect } from "vitest";
import { resolveConfig } from "../config.js";

describe("resolveConfig", () => {
  it("returns defaults when no env vars are set", () => {
    const config = resolveConfig({});

    expect(config.enabled).toBe(false);
    expect(config.uri).toBe("http://localhost:8888");
    expect(config.name).toBe("application");
    expect(config.profile).toBe("default");
    expect(config.label).toBe("main");
    expect(config.failFast).toBe(false);
    expect(config.auth).toBeUndefined();
    expect(config.retry.enabled).toBe(false);
    expect(config.retry.maxAttempts).toBe(5);
    expect(config.retry.interval).toBe(1000);
    expect(config.retry.multiplier).toBe(1.5);
    expect(config.retry.maxInterval).toBe(30000);
    expect(config.headers).toBeUndefined();
    expect(config.requestTimeout).toBe(10000);
  });

  it("resolves all env vars correctly", () => {
    const config = resolveConfig({
      SPRING_CLOUD_CONFIG_ENABLED: "true",
      SPRING_CLOUD_CONFIG_URI: "http://config:9999",
      SPRING_CLOUD_CONFIG_NAME: "my-app",
      SPRING_CLOUD_CONFIG_PROFILE: "production",
      SPRING_CLOUD_CONFIG_LABEL: "release/v2",
      SPRING_CLOUD_CONFIG_FAIL_FAST: "true",
      SPRING_CLOUD_CONFIG_AUTH_USER: "admin",
      SPRING_CLOUD_CONFIG_AUTH_PASS: "secret",
      SPRING_CLOUD_CONFIG_RETRY_ENABLED: "true",
      SPRING_CLOUD_CONFIG_RETRY_MAX_ATTEMPTS: "10",
      SPRING_CLOUD_CONFIG_RETRY_INTERVAL: "2000",
      SPRING_CLOUD_CONFIG_RETRY_MULTIPLIER: "2.0",
      SPRING_CLOUD_CONFIG_RETRY_MAX_INTERVAL: "60000",
      SPRING_CLOUD_CONFIG_REQUEST_TIMEOUT: "15000",
    });

    expect(config.enabled).toBe(true);
    expect(config.uri).toBe("http://config:9999");
    expect(config.name).toBe("my-app");
    expect(config.profile).toBe("production");
    expect(config.label).toBe("release/v2");
    expect(config.failFast).toBe(true);
    expect(config.auth).toEqual({ user: "admin", pass: "secret" });
    expect(config.retry.enabled).toBe(true);
    expect(config.retry.maxAttempts).toBe(10);
    expect(config.retry.interval).toBe(2000);
    expect(config.retry.multiplier).toBe(2.0);
    expect(config.retry.maxInterval).toBe(60000);
    expect(config.requestTimeout).toBe(15000);
  });

  it("treats non-'true' values as false for booleans", () => {
    const config = resolveConfig({
      SPRING_CLOUD_CONFIG_ENABLED: "false",
      SPRING_CLOUD_CONFIG_FAIL_FAST: "yes",
      SPRING_CLOUD_CONFIG_RETRY_ENABLED: "1",
    });

    expect(config.enabled).toBe(false);
    expect(config.failFast).toBe(false);
    expect(config.retry.enabled).toBe(false);
  });

  it("handles invalid numeric values gracefully", () => {
    const config = resolveConfig({
      SPRING_CLOUD_CONFIG_RETRY_MAX_ATTEMPTS: "not-a-number",
      SPRING_CLOUD_CONFIG_RETRY_INTERVAL: "",
      SPRING_CLOUD_CONFIG_RETRY_MULTIPLIER: "abc",
    });

    expect(config.retry.maxAttempts).toBe(5);
    expect(config.retry.interval).toBe(1000);
    expect(config.retry.multiplier).toBe(1.5);
  });

  it("omits auth when user is not set", () => {
    const config = resolveConfig({
      SPRING_CLOUD_CONFIG_AUTH_PASS: "orphaned-pass",
    });

    expect(config.auth).toBeUndefined();
  });

  it("defaults auth pass to empty string when only user is set", () => {
    const config = resolveConfig({
      SPRING_CLOUD_CONFIG_AUTH_USER: "admin",
    });

    expect(config.auth).toEqual({ user: "admin", pass: "" });
  });

  it("resolves custom headers from SPRING_CLOUD_CONFIG_HEADERS_* env vars", () => {
    const config = resolveConfig({
      SPRING_CLOUD_CONFIG_HEADERS_AUTHORIZATION: "Bearer tok123",
      SPRING_CLOUD_CONFIG_HEADERS_X_CUSTOM_HEADER: "custom-value",
    });

    expect(config.headers).toEqual({
      Authorization: "Bearer tok123",
      "X-Custom-Header": "custom-value",
    });
  });

  it("returns undefined headers when no SPRING_CLOUD_CONFIG_HEADERS_* vars exist", () => {
    const config = resolveConfig({
      SPRING_CLOUD_CONFIG_ENABLED: "true",
    });

    expect(config.headers).toBeUndefined();
  });

  it("ignores empty header values", () => {
    const config = resolveConfig({
      SPRING_CLOUD_CONFIG_HEADERS_AUTHORIZATION: "",
      SPRING_CLOUD_CONFIG_HEADERS_X_VALID: "value",
    });

    expect(config.headers).toEqual({
      "X-Valid": "value",
    });
  });

  it("resolves requestTimeout from env var", () => {
    const config = resolveConfig({
      SPRING_CLOUD_CONFIG_REQUEST_TIMEOUT: "30000",
    });

    expect(config.requestTimeout).toBe(30000);
  });

  it("defaults requestTimeout to 10000 when not set", () => {
    const config = resolveConfig({});

    expect(config.requestTimeout).toBe(10000);
  });
});
