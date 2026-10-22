import type { Blueprint } from "@aui/schema";
import type { SQLiteStorage, CacheEntry } from "./database.js";

export interface CacheOptions {
  ttlSeconds?: number;
  negativeTtlSeconds?: number;
  maxMemoryEntries?: number;
  swrRatio?: number; // e.g. 0.8 means revalidate when 80% through TTL
}

export interface CacheResult {
  hit: boolean;
  isNegative?: boolean;
  blueprint?: Blueprint;
  errorMessage?: string;
  isStale?: boolean;
}

export class VariantCache {
  private memoryCache = new Map<string, CacheEntry>();
  private memoryKeys: string[] = []; // For LRU eviction
  private ttlMs: number;
  private negativeTtlMs: number;
  private maxMemoryEntries: number;
  private swrRatio: number;

  constructor(
    private storage?: SQLiteStorage,
    options: CacheOptions = {}
  ) {
    this.ttlMs = (options.ttlSeconds ?? 3600) * 1000;
    this.negativeTtlMs = (options.negativeTtlSeconds ?? 60) * 1000;
    this.maxMemoryEntries = options.maxMemoryEntries ?? 500;
    this.swrRatio = options.swrRatio ?? 0.8;
  }

  /**
   * Generates a deterministic cache key for a site and segment
   */
  static buildKey(siteId: string, segmentKey: string, intentHash?: string): string {
    return intentHash
      ? `cache_${siteId}_${segmentKey}_${intentHash}`
      : `cache_${siteId}_${segmentKey}`;
  }

  /**
   * Retrieves a blueprint from cache (L1 memory -> L2 SQLite).
   */
  get(cacheKey: string): CacheResult {
    const now = Date.now();

    // 1. Check L1 Memory Cache
    const memEntry = this.memoryCache.get(cacheKey);
    if (memEntry) {
      if (memEntry.expiresAt < now) {
        this.evictMemory(cacheKey);
      } else {
        // Touch key for LRU
        this.touchMemoryKey(cacheKey);
        const age = now - new Date(memEntry.createdAt).getTime();
        const lifetime = memEntry.expiresAt - new Date(memEntry.createdAt).getTime();
        const isStale = lifetime > 0 && age / lifetime >= this.swrRatio;

        return {
          hit: true,
          isNegative: memEntry.isNegative,
          blueprint: memEntry.blueprint,
          errorMessage: memEntry.errorMessage,
          isStale,
        };
      }
    }

    // 2. Check L2 Storage (SQLite)
    if (this.storage) {
      const dbEntry = this.storage.getCacheEntry(cacheKey);
      if (dbEntry) {
        if (dbEntry.expiresAt >= now) {
          // Promote to L1
          this.setMemory(dbEntry);
          const age = now - new Date(dbEntry.createdAt).getTime();
          const lifetime = dbEntry.expiresAt - new Date(dbEntry.createdAt).getTime();
          const isStale = lifetime > 0 && age / lifetime >= this.swrRatio;

          return {
            hit: true,
            isNegative: dbEntry.isNegative,
            blueprint: dbEntry.blueprint,
            errorMessage: dbEntry.errorMessage,
            isStale,
          };
        }
      }
    }

    return { hit: false };
  }

  /**
   * Stores a successfully generated blueprint in cache.
   */
  set(siteId: string, segmentKey: string, blueprint: Blueprint, cacheKey?: string): void {
    const key = cacheKey || VariantCache.buildKey(siteId, segmentKey);
    const now = Date.now();
    const entry: CacheEntry = {
      cacheKey: key,
      siteId,
      segmentKey,
      blueprint,
      isNegative: false,
      expiresAt: now + this.ttlMs,
      createdAt: new Date().toISOString(),
    };

    this.setMemory(entry);
    if (this.storage) {
      this.storage.setCacheEntry(entry);
    }
  }

  /**
   * Stores a negative cache entry (e.g. policy violation, prompt injection, model timeout)
   * with a shorter TTL to protect downstream systems from repeating attacks.
   */
  setNegative(siteId: string, segmentKey: string, errorMessage: string, cacheKey?: string): void {
    const key = cacheKey || VariantCache.buildKey(siteId, segmentKey);
    const now = Date.now();
    const entry: CacheEntry = {
      cacheKey: key,
      siteId,
      segmentKey,
      errorMessage,
      isNegative: true,
      expiresAt: now + this.negativeTtlMs,
      createdAt: new Date().toISOString(),
    };

    this.setMemory(entry);
    if (this.storage) {
      this.storage.setCacheEntry(entry);
    }
  }

  /**
   * Invalidates a cache entry across L1 and L2.
   */
  invalidate(cacheKey: string): void {
    this.evictMemory(cacheKey);
    if (this.storage) {
      this.storage.deleteCacheEntry(cacheKey);
    }
  }

  // Memory cache management
  private setMemory(entry: CacheEntry): void {
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const oldestKey = this.memoryKeys.shift();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
    this.memoryCache.set(entry.cacheKey, entry);
    this.touchMemoryKey(entry.cacheKey);
  }

  private evictMemory(key: string): void {
    this.memoryCache.delete(key);
    this.memoryKeys = this.memoryKeys.filter((k) => k !== key);
  }

  private touchMemoryKey(key: string): void {
    this.memoryKeys = this.memoryKeys.filter((k) => k !== key);
    this.memoryKeys.push(key);
  }

  clearMemory(): void {
    this.memoryCache.clear();
    this.memoryKeys = [];
  }
}
