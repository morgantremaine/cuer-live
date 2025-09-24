/**
 * Debounced field tracking utility to reduce excessive logging and function calls
 * during rapid typing or field updates
 */

class DebouncedFieldTracker {
  private trackedFields = new Map<string, number>();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 300; // ms
  private readonly LOG_THROTTLE = 1000; // ms
  private lastLogTime = 0;

  /**
   * Track a field edit with debouncing to prevent excessive calls
   */
  trackField(fieldKey: string, callback?: (fieldKey: string) => void): void {
    const now = Date.now();
    this.trackedFields.set(fieldKey, now);

    // Throttled logging to prevent console spam
    if (now - this.lastLogTime > this.LOG_THROTTLE) {
      console.log(`🛡️ Batch field tracking: ${this.trackedFields.size} fields recently edited`);
      this.lastLogTime = now;
    }

    // Execute callback immediately if provided
    callback?.(fieldKey);

    // Clear existing timer and set new one for batch processing
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Process batched field updates
   */
  private processBatch(): void {
    const fieldCount = this.trackedFields.size;
    
    if (fieldCount > 0) {
      console.log(`📦 Processing ${fieldCount} field updates in batch`);
      // Clear processed fields
      this.trackedFields.clear();
    }
    
    this.batchTimer = null;
  }

  /**
   * Get currently tracked fields
   */
  getTrackedFields(): string[] {
    return Array.from(this.trackedFields.keys());
  }

  /**
   * Check if a field was recently tracked
   */
  isRecentlyTracked(fieldKey: string, maxAge: number = 3000): boolean {
    const timestamp = this.trackedFields.get(fieldKey);
    if (!timestamp) return false;
    
    return Date.now() - timestamp <= maxAge;
  }

  /**
   * Clear all tracked fields
   */
  clear(): void {
    this.trackedFields.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

// Export singleton instance
export const debouncedFieldTracker = new DebouncedFieldTracker();

/**
 * Convenience function for marking fields as recently edited with debouncing
 */
export const markFieldAsRecentlyEditedDebounced = (fieldKey: string): void => {
  debouncedFieldTracker.trackField(fieldKey);
};