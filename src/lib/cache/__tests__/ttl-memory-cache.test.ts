import { describe, expect, it, vi, afterEach } from "vitest";
import { TtlMemoryCache } from "../ttl-memory-cache";

describe("TtlMemoryCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna valor dentro do TTL", () => {
    const cache = new TtlMemoryCache<string>(5000);
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
  });

  it("expira após TTL", () => {
    vi.useFakeTimers();
    const cache = new TtlMemoryCache<string>(1000);
    cache.set("k", "v");
    vi.advanceTimersByTime(1001);
    expect(cache.get("k")).toBeUndefined();
  });
});
