import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startWorkers } from "@/workers";
import { connectDB } from "@/lib/db";
import { closeQueueConnections } from "@/lib/queues/jobs";

describe("Worker Lifecycle and Graceful Shutdown", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeQueueConnections();
  });

  it("initializes workers and shuts them down cleanly", async () => {
    const running = await startWorkers();
    expect(running.emailWorker).toBeDefined();
    expect(running.leaderboardWorker).toBeDefined();
    expect(typeof running.shutdown).toBe("function");

    // Test graceful shutdown
    await expect(running.shutdown()).resolves.toBeUndefined();
  }, 15000);
});
