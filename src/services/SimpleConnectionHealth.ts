// Simple Connection Health Service - NUCLEAR RESET VERSION
// Simplified to just track channel status and notify subscribers
// Complex retry logic moved to realtimeReset.ts

import { toast } from 'sonner';

export interface SimpleHealthStatus {
  consolidated: boolean;
  showcaller: boolean;
  cell: boolean;
  allConnected: boolean;
  anyDisconnected: boolean;
  // Keep these for backwards compatibility with existing UI components
  consecutiveFailures: number;
  isStabilizing: boolean;
}

class SimpleConnectionHealthService {
  private channelStatus = new Map<string, { consolidated: boolean; showcaller: boolean; cell: boolean }>();
  private subscribers = new Map<string, Set<(status: SimpleHealthStatus) => void>>();

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

  getHealth(rundownId: string): SimpleHealthStatus {
    const status = this.getStatus(rundownId);
    const allConnected = status.consolidated && status.showcaller && status.cell;

    return {
      ...status,
      allConnected,
      anyDisconnected: !allConnected,
      // Always 0 and false - no longer tracking these
      consecutiveFailures: 0,
      isStabilizing: false
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

  // Public method to force notify all subscribers (used after nuclear reset)
  forceNotify(rundownId: string): void {
    this.notifySubscribers(rundownId);
  }

  // Reset channel status but preserve subscribers so they receive reconnection updates
  cleanup(rundownId: string): void {
    this.channelStatus.set(rundownId, { consolidated: false, showcaller: false, cell: false });
    this.notifySubscribers(rundownId);
  }

  // Full cleanup for component unmount - removes everything
  fullCleanup(rundownId: string): void {
    this.channelStatus.delete(rundownId);
    this.subscribers.delete(rundownId);
  }
}

export const simpleConnectionHealth = new SimpleConnectionHealthService();
