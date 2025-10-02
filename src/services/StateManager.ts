/**
 * Centralized State Management Service
 * Prevents race conditions and manages concurrent state updates
 */

import { getUniversalTime } from './UniversalTimeService';

interface StateOperation<T> {
  id: string;
  timestamp: number;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

interface StateManagerOptions {
  dedupWindow?: number; // Time window for deduplication in ms
  retryAttempts?: number;
  retryDelay?: number;
}

class StateManager {
  private operationQueues = new Map<string, StateOperation<any>[]>();
  private processingKeys = new Set<string>();
  private pendingOperations = new Map<string, Promise<any>>();
  private options: Required<StateManagerOptions>;

  constructor(options: StateManagerOptions = {}) {
    this.options = {
      dedupWindow: 1000, // 1 second dedup window
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };
  }

  /**
   * Execute an operation with automatic deduplication and race condition prevention
   */
  public async execute<T>(
    key: string,
    operation: () => Promise<T>,
    dedupKey?: string
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const now = getUniversalTime();
    
    // Check for existing pending operation
    const fullKey = dedupKey ? `${key}:${dedupKey}` : key;
    const existingOperation = this.pendingOperations.get(fullKey);
    
    if (existingOperation) {
      console.log(`🔄 Deduplicating operation for key: ${fullKey}`);
      return existingOperation;
    }

    // Create new operation promise
    const operationPromise = new Promise<T>((resolve, reject) => {
      const stateOperation: StateOperation<T> = {
        id: operationId,
        timestamp: now,
        operation,
        resolve,
        reject
      };

      // Add to queue
      if (!this.operationQueues.has(key)) {
        this.operationQueues.set(key, []);
      }
      this.operationQueues.get(key)!.push(stateOperation);

      // Process queue if not already processing
      if (!this.processingKeys.has(key)) {
        this.processQueue(key);
      }
    });

    // Store pending operation for deduplication
    this.pendingOperations.set(fullKey, operationPromise);

    // Clean up after completion
    operationPromise.finally(() => {
      this.pendingOperations.delete(fullKey);
    });

    return operationPromise;
  }

  /**
   * Process operation queue for a specific key
   */
  private async processQueue(key: string): Promise<void> {
    if (this.processingKeys.has(key)) {
      return;
    }

    this.processingKeys.add(key);

    try {
      const queue = this.operationQueues.get(key);
      if (!queue || queue.length === 0) {
        return;
      }

      while (queue.length > 0) {
        const operation = queue.shift()!;
        
        try {
          const result = await this.executeWithRetry(operation.operation);
          operation.resolve(result);
        } catch (error) {
          operation.reject(error);
        }
      }
    } finally {
      this.processingKeys.delete(key);
      
      // Check if more operations were added while processing
      const queue = this.operationQueues.get(key);
      if (queue && queue.length > 0) {
        // Schedule next processing cycle
        setTimeout(() => this.processQueue(key), 0);
      }
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.options.retryAttempts) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          await this.delay(delay);
          console.warn(`🔄 Retrying operation (attempt ${attempt + 1}/${this.options.retryAttempts}):`, error);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Clear all pending operations for a key
   */
  public clearOperations(key: string): void {
    const queue = this.operationQueues.get(key);
    if (queue) {
      // Reject all pending operations
      queue.forEach(operation => {
        operation.reject(new Error('Operation cancelled'));
      });
      queue.length = 0;
    }
    
    this.processingKeys.delete(key);
  }

  /**
   * Get statistics about current operations
   */
  public getStats() {
    return {
      activeKeys: this.processingKeys.size,
      queuedOperations: Array.from(this.operationQueues.values()).reduce(
        (total, queue) => total + queue.length, 
        0
      ),
      pendingOperations: this.pendingOperations.size,
      queues: Array.from(this.operationQueues.entries()).map(([key, queue]) => ({
        key,
        queueSize: queue.length,
        isProcessing: this.processingKeys.has(key)
      }))
    };
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up all operations
   */
  public destroy(): void {
    for (const key of this.operationQueues.keys()) {
      this.clearOperations(key);
    }
    this.operationQueues.clear();
    this.pendingOperations.clear();
    this.processingKeys.clear();
  }
}

// Export singleton instance
export const stateManager = new StateManager();