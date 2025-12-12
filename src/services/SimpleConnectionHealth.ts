// Simple Connection Health Service
// Replaces the complex UnifiedConnectionHealth with straightforward tracking
// Includes stabilization delay to prevent rapid flapping during sleep/wake recovery

import { toast } from 'sonner';

export interface SimpleHealthStatus {
  consolidated: boolean;
  showcaller: boolean;
  cell: boolean;
  allConnected: boolean;
  anyDisconnected: boolean;
  consecutiveFailures: number;
  isStabilizing: boolean;
}

class SimpleConnectionHealthService {
  private channelStatus = new Map<string, { consolidated: boolean; showcaller: boolean; cell: boolean }>();
  private failureCount = new Map<string, number>();
  private subscribers = new Map<string, Set<(status: SimpleHealthStatus) => void>>();
  
  // Track which channels have already been counted in current failure cycle
  // This prevents racing where all 3 channels failing simultaneously counts as 3 failures
  private failedChannelsInCycle = new Map<string, Set<string>>();
  
  // Stabilization tracking - prevents rapid flapping during recovery
  private stabilizationTimeouts = new Map<string, NodeJS.Timeout>();
  private isStabilizing = new Map<string, boolean>();
  
  private readonly MAX_FAILURES_BEFORE_RELOAD = 15;
  private readonly STABILIZATION_DELAY_MS = 500;

  private getStatus(rundownId: string) {
    if (!this.channelStatus.has(rundownId)) {
      this.channelStatus.set(rundownId, { consolidated: false, showcaller: false, cell: false });
    }
    return this.channelStatus.get(rundownId)!;
  }

  private getFailedChannelsSet(rundownId: string): Set<string> {
    if (!this.failedChannelsInCycle.has(rundownId)) {
      this.failedChannelsInCycle.set(rundownId, new Set());
    }
    return this.failedChannelsInCycle.get(rundownId)!;
  }

  setConsolidatedConnected(rundownId: string, connected: boolean): void {
    const status = this.getStatus(rundownId);
    const wasConnected = status.consolidated;
    status.consolidated = connected;
    
    // Track failure cycle - handle both transitions from connected AND from uninitialized
    if (!connected) {
      // Channel is disconnecting - if it was connected OR this is initial state reporting disconnect
      if (wasConnected) {
        this.handleChannelFailure(rundownId, 'consolidated');
      } else {
        // First time seeing this channel as disconnected - add to failed set for tracking
        this.getFailedChannelsSet(rundownId).add('consolidated');
      }
    } else if (connected) {
      this.handleChannelRecovery(rundownId, 'consolidated');
    }
    
    this.notifySubscribers(rundownId);
  }

  setShowcallerConnected(rundownId: string, connected: boolean): void {
    const status = this.getStatus(rundownId);
    const wasConnected = status.showcaller;
    status.showcaller = connected;
    
    if (!connected) {
      if (wasConnected) {
        this.handleChannelFailure(rundownId, 'showcaller');
      } else {
        this.getFailedChannelsSet(rundownId).add('showcaller');
      }
    } else if (connected) {
      this.handleChannelRecovery(rundownId, 'showcaller');
    }
    
    this.notifySubscribers(rundownId);
  }

  setCellConnected(rundownId: string, connected: boolean): void {
    const status = this.getStatus(rundownId);
    const wasConnected = status.cell;
    status.cell = connected;
    
    if (!connected) {
      if (wasConnected) {
        this.handleChannelFailure(rundownId, 'cell');
      } else {
        this.getFailedChannelsSet(rundownId).add('cell');
      }
    } else if (connected) {
      this.handleChannelRecovery(rundownId, 'cell');
    }
    
    this.notifySubscribers(rundownId);
  }

  private handleChannelFailure(rundownId: string, channelName: string): void {
    const failedSet = this.getFailedChannelsSet(rundownId);
    
    // Cancel any pending stabilization - connection is unstable again
    this.cancelStabilization(rundownId);
    
    // Only increment failure count once per failure cycle (when first channel fails)
    if (failedSet.size === 0) {
      this.trackFailure(rundownId);
    }
    
    failedSet.add(channelName);
  }

  private handleChannelRecovery(rundownId: string, channelName: string): void {
    const failedSet = this.getFailedChannelsSet(rundownId);
    failedSet.delete(channelName);
    
    // Check if all channels are now connected
    const status = this.getStatus(rundownId);
    const allConnected = status.consolidated && status.showcaller && status.cell;
    
    if (allConnected && failedSet.size === 0) {
      // Start stabilization period before declaring full recovery
      this.startStabilization(rundownId);
    }
  }

  private startStabilization(rundownId: string): void {
    // Clear any existing stabilization timeout
    this.cancelStabilization(rundownId);
    
    console.log('🔄 All channels connected - stabilizing...');
    
    // Mark as stabilizing
    this.isStabilizing.set(rundownId, true);
    this.notifySubscribers(rundownId);
    
    // After stabilization delay, if still all connected, declare recovery
    const timeout = setTimeout(() => {
      const status = this.getStatus(rundownId);
      const stillAllConnected = status.consolidated && status.showcaller && status.cell;
      
      if (stillAllConnected) {
        this.isStabilizing.set(rundownId, false);
        this.resetFailures(rundownId);
      } else {
        // Connection dropped during stabilization, stay in unstable state
        this.isStabilizing.set(rundownId, false);
        this.notifySubscribers(rundownId);
      }
    }, this.STABILIZATION_DELAY_MS);
    
    this.stabilizationTimeouts.set(rundownId, timeout);
  }

  private cancelStabilization(rundownId: string): void {
    const timeout = this.stabilizationTimeouts.get(rundownId);
    if (timeout) {
      clearTimeout(timeout);
      this.stabilizationTimeouts.delete(rundownId);
    }
    
    if (this.isStabilizing.get(rundownId)) {
      this.isStabilizing.set(rundownId, false);
      // Don't notify here - caller will notify after their state change
    }
  }

  trackFailure(rundownId: string): void {
    const count = (this.failureCount.get(rundownId) || 0) + 1;
    this.failureCount.set(rundownId, count);
    
    console.log(`🔴 Connection failure cycle ${count}/${this.MAX_FAILURES_BEFORE_RELOAD}`);
    this.notifySubscribers(rundownId);

    // Force page reload after too many failure cycles
    if (count >= this.MAX_FAILURES_BEFORE_RELOAD) {
      console.error('🚨 Too many connection failure cycles - forcing page reload');
      toast.error('Connection could not be restored', {
        description: 'Refreshing page in 3 seconds...',
        duration: 3000,
      });
      setTimeout(() => window.location.reload(), 3000);
    }
  }

  resetFailures(rundownId: string): void {
    if (this.failureCount.get(rundownId)) {
      console.log('✅ All channels recovered - failure count reset');
    }
    this.failureCount.set(rundownId, 0);
    this.notifySubscribers(rundownId);
  }

  getHealth(rundownId: string): SimpleHealthStatus {
    const status = this.getStatus(rundownId);
    const allConnected = status.consolidated && status.showcaller && status.cell;
    const stabilizing = this.isStabilizing.get(rundownId) || false;
    
    return {
      ...status,
      allConnected,
      anyDisconnected: !allConnected,
      consecutiveFailures: this.failureCount.get(rundownId) || 0,
      isStabilizing: stabilizing
    };
  }

  areAllChannelsHealthy(rundownId: string): boolean {
    return this.getHealth(rundownId).allConnected;
  }

  subscribe(rundownId: string, callback: (status: SimpleHealthStatus) => void): () => void {
    if (!this.subscribers.has(rundownId)) {
      this.subscribers.set(rundownId, new Set());
    }
    this.subscribers.get(rundownId)!.add(callback);
    
    // Immediately notify current status
    callback(this.getHealth(rundownId));
    
    return () => {
      const subs = this.subscribers.get(rundownId);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  private notifySubscribers(rundownId: string): void {
    const subs = this.subscribers.get(rundownId);
    if (subs) {
      const health = this.getHealth(rundownId);
      subs.forEach(cb => {
        try { cb(health); } catch (e) { console.warn('Health callback error:', e); }
      });
    }
  }

  cleanup(rundownId: string): void {
    this.cancelStabilization(rundownId);
    this.channelStatus.delete(rundownId);
    this.failureCount.delete(rundownId);
    this.failedChannelsInCycle.delete(rundownId);
    this.subscribers.delete(rundownId);
    this.isStabilizing.delete(rundownId);
  }
}

export const simpleConnectionHealth = new SimpleConnectionHealthService();
