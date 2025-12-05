/**
 * Broadcast Batching Utility
 * 
 * Queues and processes incoming broadcasts in batches to reduce memory pressure
 * when many users are concurrently editing. Automatically adjusts batch interval
 * based on active user count.
 */

type UpdateType = 'cell' | 'focus' | 'structural';

interface QueuedUpdate {
  type: UpdateType;
  key: string; // Unique key for coalescing (e.g., "itemId-field")
  data: any;
  timestamp: number;
}

interface BatcherConfig {
  baseBatchInterval: number;
  intervalPerUser: number;
  maxBatchInterval: number;
  minBatchSize: number;
}

const DEFAULT_CONFIG: BatcherConfig = {
  baseBatchInterval: 500,    // 500ms base interval
  intervalPerUser: 100,      // Add 100ms per active user
  maxBatchInterval: 2000,    // Cap at 2 seconds
  minBatchSize: 5,           // Early flush if this many updates queued
};

class BroadcastBatcher {
  private queues: Map<UpdateType, Map<string, QueuedUpdate>> = new Map();
  private processors: Map<UpdateType, (updates: QueuedUpdate[]) => void> = new Map();
  private batchTimers: Map<UpdateType, NodeJS.Timeout> = new Map();
  private activeUserCount: number = 1;
  private config: BatcherConfig;
  private enabled: boolean = true;
  private memoryPressureMultiplier: number = 1;

  constructor(config: Partial<BatcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize queues for each update type
    this.queues.set('cell', new Map());
    this.queues.set('focus', new Map());
    this.queues.set('structural', new Map());
  }

  /**
   * Calculate batch interval based on user count and memory pressure
   */
  private getBatchInterval(): number {
    const baseInterval = this.config.baseBatchInterval + 
      (this.activeUserCount * this.config.intervalPerUser);
    
    const adjustedInterval = Math.min(
      baseInterval * this.memoryPressureMultiplier,
      this.config.maxBatchInterval
    );
    
    return adjustedInterval;
  }

  /**
   * Update active user count for adaptive batching
   */
  setActiveUserCount(count: number): void {
    this.activeUserCount = Math.max(1, count);
  }

  /**
   * Set memory pressure multiplier (1 = normal, 1.5 = elevated, 2 = high)
   */
  setMemoryPressureMultiplier(multiplier: number): void {
    this.memoryPressureMultiplier = Math.max(1, Math.min(3, multiplier));
  }

  /**
   * Enable or disable batching (useful for debugging)
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Flush all queues immediately when disabling
      this.flushAll();
    }
  }

  /**
   * Register a processor for a specific update type
   */
  registerProcessor(type: UpdateType, processor: (updates: QueuedUpdate[]) => void): void {
    this.processors.set(type, processor);
  }

  /**
   * Queue an update for batched processing
   * Updates with the same key are coalesced (only latest kept)
   */
  queue(type: UpdateType, key: string, data: any): void {
    if (!this.enabled) {
      // When disabled, process immediately
      const processor = this.processors.get(type);
      if (processor) {
        processor([{ type, key, data, timestamp: Date.now() }]);
      }
      return;
    }

    const queue = this.queues.get(type);
    if (!queue) return;

    // Coalesce: replace any existing update with same key
    queue.set(key, {
      type,
      key,
      data,
      timestamp: Date.now(),
    });

    // Schedule batch processing if not already scheduled
    this.scheduleBatch(type);

    // Early flush if queue is large enough
    if (queue.size >= this.config.minBatchSize) {
      this.flushQueue(type);
    }
  }

  /**
   * Schedule batch processing for a queue type
   */
  private scheduleBatch(type: UpdateType): void {
    // Don't reschedule if timer already exists
    if (this.batchTimers.has(type)) return;

    const interval = this.getBatchInterval();
    
    const timer = setTimeout(() => {
      this.flushQueue(type);
    }, interval);

    this.batchTimers.set(type, timer);
  }

  /**
   * Flush a specific queue and process all updates
   */
  private flushQueue(type: UpdateType): void {
    const timer = this.batchTimers.get(type);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(type);
    }

    const queue = this.queues.get(type);
    if (!queue || queue.size === 0) return;

    const updates = Array.from(queue.values());
    queue.clear();

    const processor = this.processors.get(type);
    if (processor) {
      try {
        processor(updates);
      } catch (error) {
        console.error(`Batch processor error for ${type}:`, error);
      }
    }
  }

  /**
   * Flush all queues immediately
   */
  flushAll(): void {
    this.flushQueue('cell');
    this.flushQueue('focus');
    this.flushQueue('structural');
  }

  /**
   * Get current batch interval (for debugging/monitoring)
   */
  getCurrentBatchInterval(): number {
    return this.getBatchInterval();
  }

  /**
   * Get queue sizes (for debugging/monitoring)
   */
  getQueueSizes(): Record<UpdateType, number> {
    return {
      cell: this.queues.get('cell')?.size || 0,
      focus: this.queues.get('focus')?.size || 0,
      structural: this.queues.get('structural')?.size || 0,
    };
  }

  /**
   * Clean up timers
   */
  cleanup(): void {
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    this.queues.forEach(queue => queue.clear());
  }
}

// Export singleton instance
export const broadcastBatcher = new BroadcastBatcher();

// Export class for testing
export { BroadcastBatcher };
export type { UpdateType, QueuedUpdate, BatcherConfig };
