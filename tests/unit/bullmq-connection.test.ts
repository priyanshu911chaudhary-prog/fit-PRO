import { describe, it, expect } from "vitest";
import { getBullMQConnectionOptions } from "@/lib/queues/connection";

describe("BullMQ Connection Configuration", () => {
  it("enforces maxRetriesPerRequest is strictly null as required by BullMQ", () => {
    const options = getBullMQConnectionOptions();
    expect(options.maxRetriesPerRequest).toBeNull();
  });

  it("enables offline queue for resilient job enqueueing during reconnection", () => {
    const options = getBullMQConnectionOptions();
    expect(options.enableOfflineQueue).toBe(true);
  });

  it("implements bounded exponential backoff retry strategy", () => {
    const options = getBullMQConnectionOptions();
    expect(typeof options.retryStrategy).toBe("function");

    if (typeof options.retryStrategy === "function") {
      expect(options.retryStrategy(1)).toBe(100);
      expect(options.retryStrategy(5)).toBe(500);
      expect(options.retryStrategy(20)).toBe(2000);
      expect(options.retryStrategy(50)).toBe(3000); // Capped at 3000ms
    }
  });

  it("reconnects on expected transient network and replica errors", () => {
    const options = getBullMQConnectionOptions();
    expect(typeof options.reconnectOnError).toBe("function");

    if (typeof options.reconnectOnError === "function") {
      expect(options.reconnectOnError(new Error("READONLY You can't write against a read only replica."))).toBe(true);
      expect(options.reconnectOnError(new Error("Connection ETIMEDOUT"))).toBe(true);
      expect(options.reconnectOnError(new Error("ECONNRESET by peer"))).toBe(true);
      expect(options.reconnectOnError(new Error("WRONGTYPE Operation against a key holding the wrong kind of value"))).toBe(false);
    }
  });
});
