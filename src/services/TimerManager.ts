/**
 * Centralized Timer Management Service
 * Prevents memory leaks by tracking and automatically cleaning up all timers
 */

interface TimerInfo {
  id: string;
  type: 'timeout' | 'interval';
  callback: () => void;
  delay: number;
  createdAt: number;
  component?: string; // Optional component identifier
  nativeId: number;
}

class TimerManager {
  private timers = new Map<string, TimerInfo>();
  private static instance: TimerManager | null = null;
  private cleanupTimeout: number | null = null;
  private idCounter = 0;

  constructor() {
    this.startPeriodicCleanup();
    
    // Handle page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearAll();
      });
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  /**
   * Create a timeout with automatic tracking
   */
  public setTimeout(
    callback: () => void, 
    delay: number, 
    component?: string
  ): string {
    const id = this.generateId();
    
    const nativeId = window.setTimeout(() => {
      // Execute callback
      try {
        callback();
      } catch (error) {
        console.error(`Timer callback error in ${component || 'unknown'}:`, error);
      }
      
      // Remove from tracking after execution
      this.timers.delete(id);
    }, delay);

    const timerInfo: TimerInfo = {
      id,
      type: 'timeout',
      callback,
      delay,
      createdAt: Date.now(),
      component,
      nativeId
    };

    this.timers.set(id, timerInfo);
    return id;
  }

  /**
   * Create an interval with automatic tracking
   */
  public setInterval(
    callback: () => void, 
    delay: number, 
    component?: string
  ): string {
    const id = this.generateId();
    
    const nativeId = window.setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error(`Timer callback error in ${component || 'unknown'}:`, error);
      }
    }, delay);

    const timerInfo: TimerInfo = {
      id,
      type: 'interval',
      callback,
      delay,
      createdAt: Date.now(),
      component,
      nativeId
    };

    this.timers.set(id, timerInfo);
    return id;
  }

  /**
   * Clear a specific timer
   */
  public clearTimer(id: string): boolean {
    const timer = this.timers.get(id);
    if (!timer) {
      return false;
    }

    if (timer.type === 'timeout') {
      window.clearTimeout(timer.nativeId);
    } else {
      window.clearInterval(timer.nativeId);
    }

    this.timers.delete(id);
    return true;
  }

  /**
   * Clear all timers for a specific component
   */
  public clearComponentTimers(component: string): number {
    let clearedCount = 0;
    
    for (const [id, timer] of this.timers.entries()) {
      if (timer.component === component) {
        this.clearTimer(id);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  /**
   * Clear all timers
   */
  public clearAll(): number {
    const count = this.timers.size;
    
    for (const timer of this.timers.values()) {
      if (timer.type === 'timeout') {
        window.clearTimeout(timer.nativeId);
      } else {
        window.clearInterval(timer.nativeId);
      }
    }

    this.timers.clear();
    return count;
  }

  /**
   * Get timer statistics
   */
  public getStats() {
    const stats = {
      total: this.timers.size,
      timeouts: 0,
      intervals: 0,
      byComponent: new Map<string, number>(),
      oldestTimer: 0
    };

    let oldestTime = Date.now();

    for (const timer of this.timers.values()) {
      if (timer.type === 'timeout') {
        stats.timeouts++;
      } else {
        stats.intervals++;
      }

      const component = timer.component || 'unknown';
      stats.byComponent.set(component, (stats.byComponent.get(component) || 0) + 1);

      if (timer.createdAt < oldestTime) {
        oldestTime = timer.createdAt;
      }
    }

    stats.oldestTimer = Date.now() - oldestTime;
    return stats;
  }

  /**
   * Check for potential memory leaks (long-running timers)
   */
  public detectMemoryLeaks(): TimerInfo[] {
    const leakThreshold = 30 * 60 * 1000; // 30 minutes (increased from 5)
    const now = Date.now();
    const potentialLeaks: TimerInfo[] = [];

    for (const timer of this.timers.values()) {
      if (now - timer.createdAt > leakThreshold) {
        potentialLeaks.push(timer);
      }
    }

    // Only warn if there are many potential leaks to reduce console noise
    if (potentialLeaks.length > 3) {
      console.warn('🚨 Potential timer memory leaks detected:', potentialLeaks);
    }

    return potentialLeaks;
  }

  /**
   * Generate unique timer ID
   */
  private generateId(): string {
    return `timer_${++this.idCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

   /**
    * Start periodic cleanup of completed timers and leak detection
    */
   private startPeriodicCleanup(): void {
     // Use managed timeout to prevent memory leaks in the manager itself
     this.cleanupTimeout = window.setTimeout(() => {
       // Detect potential leaks (reduce threshold to avoid excessive warnings)
       const leaks = this.detectMemoryLeaks();
       
       // Log stats only if there are significant issues
       const stats = this.getStats();
       if (stats.total > 100) { // Increased threshold
         console.warn('🔥 High timer count detected:', stats);
       }
       
       // Schedule next cleanup (reduced frequency)
       this.startPeriodicCleanup();
     }, 300000); // Check every 5 minutes instead of every minute
   }

  /**
   * Clean up the timer manager itself
   */
  public destroy(): void {
    this.clearAll();
    
    if (this.cleanupTimeout) {
      window.clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
  }
}

// Export singleton instance and convenience functions
export const timerManager = TimerManager.getInstance();
export const setManagedTimeout = (callback: () => void, delay: number, component?: string): string =>
  timerManager.setTimeout(callback, delay, component);
export const setManagedInterval = (callback: () => void, delay: number, component?: string): string =>
  timerManager.setInterval(callback, delay, component);
export const clearManagedTimer = (id: string): boolean => timerManager.clearTimer(id);
export const clearComponentTimers = (component: string): number => timerManager.clearComponentTimers(component);