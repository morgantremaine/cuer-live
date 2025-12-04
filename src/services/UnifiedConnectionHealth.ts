// Unified Connection Health Service
// Tracks health of ALL realtime channels and provides unified status

import { showcallerBroadcast } from '@/utils/showcallerBroadcast';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { toast } from 'sonner';

export interface ChannelHealth {
  consolidated: boolean;
  showcaller: boolean;
  cell: boolean;
  allHealthy: boolean;
  anyDegraded: boolean;
  consecutiveGlobalFailures: number;
}

interface GlobalSubscriptionState {
  isConnected: boolean;
}

class UnifiedConnectionHealthService {
  private consolidatedStates = new Map<string, boolean>();
  private globalFailureCount = new Map<string, number>();
  private lastDegradedWarningTime = new Map<string, number>();
  private connectionWarningCallbacks = new Map<string, Set<(health: ChannelHealth) => void>>();
  private stabilizationTimers = new Map<string, NodeJS.Timeout>();
  
  private readonly DEGRADED_WARNING_COOLDOWN_MS = 30000; // 30 seconds between warnings
  private readonly GLOBAL_FAILURE_THRESHOLD = 10; // After 10 combined failures across channels
  private readonly STABILIZATION_WAIT_MS = 3000; // Wait 3 seconds for channels to stabilize

  // Update consolidated channel status (called from useConsolidatedRealtimeRundown)
  setConsolidatedStatus(rundownId: string, isConnected: boolean): void {
    this.consolidatedStates.set(rundownId, isConnected);
    this.checkAndNotify(rundownId);
  }

  // Get health status for all channels
  getHealth(rundownId: string): ChannelHealth {
    const consolidated = this.consolidatedStates.get(rundownId) ?? false;
    const showcaller = showcallerBroadcast.isChannelConnected(rundownId);
    const cell = cellBroadcast.isChannelConnected(rundownId);
    
    const allHealthy = consolidated && showcaller && cell;
    const anyDegraded = (consolidated || showcaller || cell) && !allHealthy;
    
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
  trackFailure(rundownId: string): void {
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

  // Reset failure count (called on successful recovery)
  resetFailures(rundownId: string): void {
    this.globalFailureCount.set(rundownId, 0);
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
    this.globalFailureCount.delete(rundownId);
    this.lastDegradedWarningTime.delete(rundownId);
    this.connectionWarningCallbacks.delete(rundownId);
    
    const timer = this.stabilizationTimers.get(rundownId);
    if (timer) {
      clearTimeout(timer);
      this.stabilizationTimers.delete(rundownId);
    }
  }
}

export const unifiedConnectionHealth = new UnifiedConnectionHealthService();
