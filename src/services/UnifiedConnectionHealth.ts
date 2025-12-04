// Unified Connection Health Service
// Tracks health of ALL realtime channels and provides unified status

import { toast } from 'sonner';

export interface ChannelHealth {
  consolidated: boolean;
  showcaller: boolean;
  cell: boolean;
  allHealthy: boolean;
  anyDegraded: boolean;
  consecutiveGlobalFailures: number;
}

class UnifiedConnectionHealthService {
  private consolidatedStates = new Map<string, boolean>();
  private globalFailureCount = new Map<string, number>();
  private lastFailureTime = new Map<string, number>(); // Debounce failures
  private connectionWarningCallbacks = new Map<string, Set<(health: ChannelHealth) => void>>();
  private stabilizationTimers = new Map<string, NodeJS.Timeout>();
  private startupTimes = new Map<string, number>(); // Track when rundown first initializes
  
  private readonly FAILURE_DEBOUNCE_MS = 3000; // Count multiple failures within 3s as one event
  private readonly GLOBAL_FAILURE_THRESHOLD = 15; // After 15 combined failures across channels
  private readonly STABILIZATION_WAIT_MS = 5000; // Wait 5 seconds for channels to stabilize
  private readonly STARTUP_GRACE_MS = 5000; // Don't show degraded warnings during initial connection

  // Update consolidated channel status (called from useConsolidatedRealtimeRundown)
  setConsolidatedStatus(rundownId: string, isConnected: boolean): void {
    // Track startup time on first status update
    if (!this.startupTimes.has(rundownId)) {
      this.startupTimes.set(rundownId, Date.now());
    }
    this.consolidatedStates.set(rundownId, isConnected);
    this.checkAndNotify(rundownId);
  }

  // Direct status setters for showcaller and cell (avoids circular imports)
  private showcallerStates = new Map<string, boolean>();
  private cellStates = new Map<string, boolean>();

  setShowcallerStatus(rundownId: string, isConnected: boolean): void {
    // Track startup time on first status update
    if (!this.startupTimes.has(rundownId)) {
      this.startupTimes.set(rundownId, Date.now());
    }
    this.showcallerStates.set(rundownId, isConnected);
    this.checkAndNotify(rundownId);
  }

  setCellStatus(rundownId: string, isConnected: boolean): void {
    // Track startup time on first status update
    if (!this.startupTimes.has(rundownId)) {
      this.startupTimes.set(rundownId, Date.now());
    }
    this.cellStates.set(rundownId, isConnected);
    this.checkAndNotify(rundownId);
  }

  // Get health status for all channels
  getHealth(rundownId: string): ChannelHealth {
    const consolidated = this.consolidatedStates.get(rundownId) ?? false;
    const showcaller = this.showcallerStates.get(rundownId) ?? false;
    const cell = this.cellStates.get(rundownId) ?? false;
    
    const allHealthy = consolidated && showcaller && cell;
    
    // Don't show degraded warnings during initial startup grace period
    const startupTime = this.startupTimes.get(rundownId);
    const isInStartupGrace = startupTime && (Date.now() - startupTime < this.STARTUP_GRACE_MS);
    const anyDegraded = isInStartupGrace ? false : (consolidated || showcaller || cell) && !allHealthy;
    
    return {
      consolidated,
      showcaller,
      cell,
      allHealthy,
      anyDegraded,
      consecutiveGlobalFailures: this.globalFailureCount.get(rundownId) || 0
    };
  }

  // Check if ALL channels are healthy
  areAllChannelsHealthy(rundownId: string): boolean {
    return this.getHealth(rundownId).allHealthy;
  }

  // Wait for all channels to stabilize with timeout
  async waitForStabilization(rundownId: string, maxWaitMs: number = this.STABILIZATION_WAIT_MS): Promise<boolean> {
    const startTime = Date.now();
    
    // Clear any existing stabilization timer
    const existingTimer = this.stabilizationTimers.get(rundownId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise((resolve) => {
      const checkHealth = () => {
        const health = this.getHealth(rundownId);
        
        if (health.allHealthy) {
          console.log('✅ All channels stabilized and healthy');
          resolve(true);
          return;
        }
        
        const elapsed = Date.now() - startTime;
        if (elapsed >= maxWaitMs) {
          console.warn('⚠️ Channel stabilization timeout - some channels still unhealthy:', {
            consolidated: health.consolidated,
            showcaller: health.showcaller,
            cell: health.cell,
            elapsed
          });
          resolve(false);
          return;
        }
        
        // Check again in 500ms
        const timer = setTimeout(checkHealth, 500);
        this.stabilizationTimers.set(rundownId, timer);
      };
      
      // Start checking
      checkHealth();
    });
  }

  // Track global failure (called when any channel fails)
  // DEBOUNCED: Multiple failures within FAILURE_DEBOUNCE_MS count as one event
  trackFailure(rundownId: string): void {
    const now = Date.now();
    const lastFailure = this.lastFailureTime.get(rundownId) || 0;
    
    // Debounce: if another failure came within 3 seconds, don't increment
    if (now - lastFailure < this.FAILURE_DEBOUNCE_MS) {
      console.log('🔴 Failure debounced - within 3s window');
      return;
    }
    
    this.lastFailureTime.set(rundownId, now);
    const count = (this.globalFailureCount.get(rundownId) || 0) + 1;
    this.globalFailureCount.set(rundownId, count);
    
    console.log(`🔴 Global failure count: ${count}/${this.GLOBAL_FAILURE_THRESHOLD}`);
    
    this.checkAndNotify(rundownId);
    
    // Force page reload after threshold
    if (count >= this.GLOBAL_FAILURE_THRESHOLD) {
      console.error('🚨 Too many combined channel failures - forcing page reload');
      toast.error("Connection could not be restored", {
        description: "Refreshing page in 3 seconds to recover...",
        duration: 3000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }

  // Reset failure count (called on successful recovery of ALL channels)
  resetFailures(rundownId: string): void {
    const hadFailures = (this.globalFailureCount.get(rundownId) || 0) > 0;
    this.globalFailureCount.set(rundownId, 0);
    this.lastFailureTime.delete(rundownId);
    
    if (hadFailures) {
      console.log('✅ Global failure count reset - all channels recovered');
    }
    
    this.checkAndNotify(rundownId);
  }

  // Subscribe to health changes
  subscribe(rundownId: string, callback: (health: ChannelHealth) => void): () => void {
    if (!this.connectionWarningCallbacks.has(rundownId)) {
      this.connectionWarningCallbacks.set(rundownId, new Set());
    }
    this.connectionWarningCallbacks.get(rundownId)!.add(callback);
    
    // Immediately notify current state
    callback(this.getHealth(rundownId));
    
    return () => {
      const callbacks = this.connectionWarningCallbacks.get(rundownId);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  // Check health and notify subscribers
  private checkAndNotify(rundownId: string): void {
    const health = this.getHealth(rundownId);
    const callbacks = this.connectionWarningCallbacks.get(rundownId);
    
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(health);
        } catch (e) {
          console.warn('Error in health callback:', e);
        }
      });
    }
  }

  // Cleanup for a rundown
  cleanup(rundownId: string): void {
    this.consolidatedStates.delete(rundownId);
    this.showcallerStates.delete(rundownId);
    this.cellStates.delete(rundownId);
    this.globalFailureCount.delete(rundownId);
    this.lastFailureTime.delete(rundownId);
    this.connectionWarningCallbacks.delete(rundownId);
    this.startupTimes.delete(rundownId); // Clean up startup tracking
    
    const timer = this.stabilizationTimers.get(rundownId);
    if (timer) {
      clearTimeout(timer);
      this.stabilizationTimers.delete(rundownId);
    }
  }
}

export const unifiedConnectionHealth = new UnifiedConnectionHealthService();
