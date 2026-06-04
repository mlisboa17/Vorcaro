import type { VorcaroIntent } from "../../domain/types/vorcaro-intent";
import type { VorcaroToolResult } from "../../domain/types/vorcaro-intent";
import { VORCARO_INTENT_CACHE_TTL_MS } from "../../domain/types/vorcaro-intent";

type CacheEntry<T> = { value: T; expiresAt: number };

export class VorcaroIntentCacheService {
  private readonly intentCache = new Map<string, CacheEntry<VorcaroIntent>>();
  private readonly toolCache = new Map<string, CacheEntry<VorcaroToolResult>>();

  getIntent(key: string): VorcaroIntent | null {
    return this.get(this.intentCache, key);
  }

  setIntent(key: string, intent: VorcaroIntent): void {
    this.set(this.intentCache, key, intent);
  }

  getToolResult(key: string): VorcaroToolResult | null {
    return this.get(this.toolCache, key);
  }

  setToolResult(key: string, result: VorcaroToolResult): void {
    this.set(this.toolCache, key, result);
  }

  buildIntentKey(userId: string, message: string): string {
    return `${userId}:intent:${message.trim().toLowerCase().slice(0, 200)}`;
  }

  buildToolKey(userId: string, toolName: string): string {
    return `${userId}:tool:${toolName}`;
  }

  clear(userId?: string): void {
    if (!userId) {
      this.intentCache.clear();
      this.toolCache.clear();
      return;
    }
    for (const key of this.intentCache.keys()) {
      if (key.startsWith(`${userId}:`)) this.intentCache.delete(key);
    }
    for (const key of this.toolCache.keys()) {
      if (key.startsWith(`${userId}:`)) this.toolCache.delete(key);
    }
  }

  private get<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
    const hit = map.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
      map.delete(key);
      return null;
    }
    return hit.value;
  }

  private set<T>(map: Map<string, CacheEntry<T>>, key: string, value: T): void {
    map.set(key, { value, expiresAt: Date.now() + VORCARO_INTENT_CACHE_TTL_MS });
  }
}

export const vorcaroIntentCache = new VorcaroIntentCacheService();
