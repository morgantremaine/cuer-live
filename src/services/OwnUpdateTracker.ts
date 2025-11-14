/**
 * Centralized service for tracking own updates to prevent feedback loops
 * in real-time collaborative editing systems.
 * 
 * Replaces 17+ inconsistent trackOwnUpdate implementations across the codebase
 * with a single, consistent mechanism using 30-second cleanup.
 */

interface TrackedUpdate {
  updateId: string;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

class OwnUpdateTracker {
  // Context-aware tracking: Map<context, Map<updateId, TrackedUpdate>>
  private contextTracking: Map<string, Map<string, TrackedUpdate>> = new Map();
  
  // Global tracking (no context)
  private globalTracking: Map<string, TrackedUpdate> = new Map();
  
  private readonly DEFAULT_CLEANUP_MS = 30000; // 30 seconds - consistent across all systems

  /**
   * Track an update as originating from this client
   * @param updateId - Unique identifier for the update (typically a timestamp or UUID)
   * @param context - Optional context to scope the tracking (e.g., rundownId, 'showcaller')
   * @param cleanupMs - Time in milliseconds before auto-cleanup (default: 30000)
   */
  track(updateId: string, context?: string, cleanupMs: number = this.DEFAULT_CLEANUP_MS): void {
    if (!updateId) {
      console.warn('⚠️ OwnUpdateTracker: Cannot track empty updateId');
      return;
    }

    const timeout = setTimeout(() => {
      this.remove(updateId, context);
    }, cleanupMs);

    const trackedUpdate: TrackedUpdate = {
      updateId,
      timestamp: Date.now(),
      timeout
    };

    if (context) {
      // Context-aware tracking
      if (!this.contextTracking.has(context)) {
        this.contextTracking.set(context, new Map());
      }
      const contextMap = this.contextTracking.get(context)!;
      
      // Clear any existing timeout for this updateId in this context
      const existing = contextMap.get(updateId);
      if (existing) {
        clearTimeout(existing.timeout);
      }
      
      contextMap.set(updateId, trackedUpdate);
    } else {
      // Global tracking
      const existing = this.globalTracking.get(updateId);
      if (existing) {
        clearTimeout(existing.timeout);
      }
      
      this.globalTracking.set(updateId, trackedUpdate);
    }
  }

  /**
   * Check if an update is tracked (originated from this client)
   * @param updateId - The update identifier to check
   * @param context - Optional context to check within
   * @returns true if the update is tracked (should be ignored)
   */
  isTracked(updateId: string, context?: string): boolean {
    if (!updateId) return false;

    if (context) {
      const contextMap = this.contextTracking.get(context);
      return contextMap ? contextMap.has(updateId) : false;
    } else {
      return this.globalTracking.has(updateId);
    }
  }

  /**
   * Alias for isTracked - checks if an update originated from this client
   * Used for backward compatibility
   */
  isOwnUpdate(rundownId: string, docVersion?: number): boolean {
    // Check by rundownId first
    if (this.isTracked(rundownId)) return true;
    
    // If docVersion provided, also check that
    if (docVersion !== undefined) {
      return this.isTracked(`${rundownId}-${docVersion}`);
    }
    
    return false;
  }

  /**
   * Manually remove a tracked update
   * @param updateId - The update identifier to remove
   * @param context - Optional context to remove from
   */
  remove(updateId: string, context?: string): void {
    if (context) {
      const contextMap = this.contextTracking.get(context);
      if (contextMap) {
        const tracked = contextMap.get(updateId);
        if (tracked) {
          clearTimeout(tracked.timeout);
          contextMap.delete(updateId);
          
          // Clean up empty context maps
          if (contextMap.size === 0) {
            this.contextTracking.delete(context);
          }
        }
      }
    } else {
      const tracked = this.globalTracking.get(updateId);
      if (tracked) {
        clearTimeout(tracked.timeout);
        this.globalTracking.delete(updateId);
      }
    }
  }

  /**
   * Clear all tracked updates for a specific context
   * @param context - Context to clear (if undefined, clears global tracking)
   */
  clear(context?: string): void {
    if (context) {
      const contextMap = this.contextTracking.get(context);
      if (contextMap) {
        // Clear all timeouts
        contextMap.forEach(tracked => clearTimeout(tracked.timeout));
        this.contextTracking.delete(context);
        console.log(`🧹 OwnUpdateTracker: Cleared context [${context}]`);
      }
    } else {
      // Clear global tracking
      this.globalTracking.forEach(tracked => clearTimeout(tracked.timeout));
      this.globalTracking.clear();
      console.log(`🧹 OwnUpdateTracker: Cleared global tracking`);
    }
  }

  /**
   * Clear all tracked updates across all contexts
   */
  clearAll(): void {
    // Clear all context tracking
    this.contextTracking.forEach((contextMap, context) => {
      contextMap.forEach(tracked => clearTimeout(tracked.timeout));
    });
    this.contextTracking.clear();

    // Clear global tracking
    this.globalTracking.forEach(tracked => clearTimeout(tracked.timeout));
    this.globalTracking.clear();

    console.log(`🧹 OwnUpdateTracker: Cleared all tracking`);
  }

  /**
   * Get statistics about tracked updates (useful for debugging)
   */
  getStats(): {
    contexts: string[];
    totalTracked: number;
    byContext: Record<string, number>;
    globalTracked: number;
  } {
    const byContext: Record<string, number> = {};
    let totalTracked = this.globalTracking.size;

    this.contextTracking.forEach((contextMap, context) => {
      byContext[context] = contextMap.size;
      totalTracked += contextMap.size;
    });

    return {
      contexts: Array.from(this.contextTracking.keys()),
      totalTracked,
      byContext,
      globalTracked: this.globalTracking.size
    };
  }

  /**
   * Get the default cleanup time (30 seconds)
   */
  getDefaultCleanupMs(): number {
    return this.DEFAULT_CLEANUP_MS;
  }
}

// Export singleton instance
export const ownUpdateTracker = new OwnUpdateTracker();
