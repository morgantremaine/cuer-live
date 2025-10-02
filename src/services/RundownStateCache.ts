/**
 * Consolidated cache service for rundown state persistence
 * Replaces multiple global Maps with aggressive LRU and age-based eviction
 * Prevents memory leaks by limiting cache size and automatically cleaning stale entries
 */

interface CacheEntry {
  state: any;
  timestamp: number;
  accessCount: number;
}

class RundownStateCache {
  private cache = new Map<string, CacheEntry>();
  private readonly MAX_ENTRIES = 10; // Keep only 10 most recent rundowns
  private readonly MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Clean up stale entries based on age and LRU policy
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove entries older than MAX_AGE_MS
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.MAX_AGE_MS) {
        this.cache.delete(key);
        console.log('🧹 RundownStateCache: Removed stale entry:', key);
      }
    }

    // If still over limit, remove least recently used entries
    if (this.cache.size > this.MAX_ENTRIES) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => {
          // Sort by access count (ascending) then timestamp (ascending)
          if (a[1].accessCount !== b[1].accessCount) {
            return a[1].accessCount - b[1].accessCount;
          }
          return a[1].timestamp - b[1].timestamp;
        });

      const toRemove = sortedEntries.slice(0, this.cache.size - this.MAX_ENTRIES);
      toRemove.forEach(([key]) => {
        this.cache.delete(key);
        console.log('🧹 RundownStateCache: Removed LRU entry:', key);
      });
    }
  }

  /**
   * Set a cache entry with automatic cleanup
   */
  set(key: string, state: any): void {
    this.cleanup();
    
    const existing = this.cache.get(key);
    this.cache.set(key, {
      state,
      timestamp: Date.now(),
      accessCount: existing ? existing.accessCount + 1 : 1
    });
  }

  /**
   * Get a cache entry and update access tracking
   */
  get(key: string): any | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Update access tracking
    entry.accessCount++;
    entry.timestamp = Date.now();
    
    return entry.state;
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('🧹 RundownStateCache: Cleared all entries');
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const rundownStateCache = new RundownStateCache();
