// Simple Connection Health Service
// Replaces the complex UnifiedConnectionHealth with straightforward tracking
// No coordination, no stabilization waits, just simple status reporting

import { toast } from 'sonner';

export interface SimpleHealthStatus {
  consolidated: boolean;
  showcaller: boolean;
  cell: boolean;
  allConnected: boolean;
  anyDisconnected: boolean;
  consecutiveFailures: number;
}

class SimpleConnectionHealthService {
  private channelStatus = new Map<string, { consolidated: boolean; showcaller: boolean; cell: boolean }>();
  private failureCount = new Map<string, number>();
  private subscribers = new Map<string, Set<(status: SimpleHealthStatus) => void>>();
  
  private readonly MAX_FAILURES_BEFORE_RELOAD = 15;

  private getStatus(rundownId: string) {
    if (!this.channelStatus.has(rundownId)) {
      this.channelStatus.set(rundownId, { consolidated: false, showcaller: false, cell: false });
    }
    return this.channelStatus.get(rundownId)!;
  }

  setConsolidatedConnected(rundownId: string, connected: boolean): void {
    const status = this.getStatus(rundownId);
    status.consolidated = connected;
    this.notifySubscribers(rundownId);
  }

  setShowcallerConnected(rundownId: string, connected: boolean): void {
    const status = this.getStatus(rundownId);
    status.showcaller = connected;
    this.notifySubscribers(rundownId);
  }

  setCellConnected(rundownId: string, connected: boolean): void {
    const status = this.getStatus(rundownId);
    status.cell = connected;
    this.notifySubscribers(rundownId);
  }

  trackFailure(rundownId: string): void {
    const count = (this.failureCount.get(rundownId) || 0) + 1;
    this.failureCount.set(rundownId, count);
    
    console.log(`🔴 Connection failure ${count}/${this.MAX_FAILURES_BEFORE_RELOAD}`);
    this.notifySubscribers(rundownId);

    // Force page reload after too many failures
    if (count >= this.MAX_FAILURES_BEFORE_RELOAD) {
      console.error('🚨 Too many connection failures - forcing page reload');
      toast.error('Connection could not be restored', {
        description: 'Refreshing page in 3 seconds...',
        duration: 3000,
      });
      setTimeout(() => window.location.reload(), 3000);
    }
  }

  resetFailures(rundownId: string): void {
    if (this.failureCount.get(rundownId)) {
      console.log('✅ Connection failures reset');
    }
    this.failureCount.set(rundownId, 0);
    this.notifySubscribers(rundownId);
  }

  getHealth(rundownId: string): SimpleHealthStatus {
    const status = this.getStatus(rundownId);
    const allConnected = status.consolidated && status.showcaller && status.cell;
    
    return {
      ...status,
      allConnected,
      anyDisconnected: !allConnected,
      consecutiveFailures: this.failureCount.get(rundownId) || 0
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
    this.channelStatus.delete(rundownId);
    this.failureCount.delete(rundownId);
    this.subscribers.delete(rundownId);
  }
}

export const simpleConnectionHealth = new SimpleConnectionHealthService();
