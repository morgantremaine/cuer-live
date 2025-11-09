/**
 * Phase 3: Performance optimization utilities
 * Collection of helpers for optimal table rendering performance
 */

// Debounce function for expensive operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for high-frequency events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// RequestAnimationFrame-based throttle for scroll events
export const rafThrottle = <T extends (...args: any[]) => any>(
  func: T
): ((...args: Parameters<T>) => void) => {
  let rafId: number | null = null;
  
  return (...args: Parameters<T>) => {
    if (rafId !== null) return;
    
    rafId = requestAnimationFrame(() => {
      func(...args);
      rafId = null;
    });
  };
};

// Check if virtualization should be enabled based on items count
export const shouldEnableVirtualization = (itemCount: number): boolean => {
  return itemCount > 50;
};

// Calculate optimal overscan count based on item count
export const getOptimalOverscan = (itemCount: number): number => {
  if (itemCount < 100) return 5;
  if (itemCount < 500) return 10;
  return 20;
};

// Memoization cache for expensive calculations
export class MemoizationCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    // Implement LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Performance measurement utility
export const measurePerformance = (label: string, fn: () => void): void => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  } else {
    fn();
  }
};

// Batch state updates for better performance
export const batchUpdates = <T>(
  updates: Array<() => void>,
  callback?: () => void
): void => {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
    callback?.();
  });
};
