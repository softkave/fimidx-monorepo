import { describe, expect, it, vi } from "vitest";
import {
  isRetryableMongoNetworkError,
  withMongoRetry,
} from "../withMongoRetry.js";

describe("isRetryableMongoNetworkError", () => {
  it("detects MongoNetworkError by name", () => {
    const err = Object.assign(new Error("TLS failed"), {
      name: "MongoNetworkError",
    });
    expect(isRetryableMongoNetworkError(err)).toBe(true);
  });

  it("detects ResetPool label", () => {
    const err = Object.assign(new Error("pool cleared"), {
      name: "MongoBulkWriteError",
      errorLabelSet: new Set(["ResetPool"]),
    });
    expect(isRetryableMongoNetworkError(err)).toBe(true);
  });

  it("detects message patterns", () => {
    expect(
      isRetryableMongoNetworkError(
        new Error(
          "Client network socket disconnected before secure TLS connection was established"
        )
      )
    ).toBe(true);
  });

  it("rejects unrelated errors", () => {
    expect(isRetryableMongoNetworkError(new Error("validation failed"))).toBe(
      false
    );
    expect(isRetryableMongoNetworkError(null)).toBe(false);
  });
});

describe("withMongoRetry", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    await expect(withMongoRetry(fn, { attempts: 3 })).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries retryable errors then succeeds", async () => {
    const networkErr = Object.assign(new Error("ECONNRESET"), {
      name: "MongoNetworkError",
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(networkErr)
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValue("ok");

    await expect(
      withMongoRetry(fn, { attempts: 3, baseDelayMs: 1 })
    ).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("validation failed"));
    await expect(
      withMongoRetry(fn, { attempts: 3, baseDelayMs: 1 })
    ).rejects.toThrow("validation failed");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting retries", async () => {
    const networkErr = Object.assign(new Error("TLS"), {
      name: "MongoNetworkError",
    });
    const fn = vi.fn().mockRejectedValue(networkErr);
    await expect(
      withMongoRetry(fn, { attempts: 2, baseDelayMs: 1 })
    ).rejects.toBe(networkErr);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
