import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../retry.js";
import type { RetryConfig } from "../types.js";

const disabledRetry: RetryConfig = {
  enabled: false,
  maxAttempts: 5,
  interval: 10,
  multiplier: 1.5,
  maxInterval: 1000,
};

const enabledRetry: RetryConfig = {
  enabled: true,
  maxAttempts: 3,
  interval: 10, // short for tests
  multiplier: 2,
  maxInterval: 1000,
};

describe("withRetry", () => {
  it("calls function once when retry is disabled", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, disabledRetry);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws immediately when retry is disabled and function fails", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(withRetry(fn, disabledRetry)).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries up to maxAttempts on failure", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockRejectedValueOnce(new Error("fail 3"));

    await expect(withRetry(fn, enabledRetry)).rejects.toThrow("fail 3");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("succeeds on retry after initial failure", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, enabledRetry);

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("succeeds immediately if first attempt works", async () => {
    const fn = vi.fn().mockResolvedValue("instant");

    const result = await withRetry(fn, enabledRetry);

    expect(result).toBe("instant");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("handles non-Error rejections", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce("string error")
      .mockResolvedValue("ok");

    const result = await withRetry(fn, enabledRetry);
    expect(result).toBe("ok");
  });
});
