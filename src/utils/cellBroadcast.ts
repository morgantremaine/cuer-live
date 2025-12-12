// Cell broadcast system - SIMPLIFIED
// Uses simple exponential backoff reconnection
import { supabase } from '@/integrations/supabase/client';
import { debugLogger } from '@/utils/debugLogger';
import { simpleConnectionHealth } from '@/services/SimpleConnectionHealth';
import { authMonitor } from '@/services/AuthMonitor';

interface CellUpdate {
  rundownId: string;
  itemId?: string;
  field: string;
  value: any;
  userId: string;
  tabId: string;
  timestamp: number;
}

interface CellFocus {
  rundownId: string;
  itemId?: string;
  field: string;
  userId: string;
  userName: string;
  tabId: string;
  isFocused: boolean;
  timestamp: number;
}

export class CellBroadcastManager {
  private channels = new Map<string, any>();
  private callbacks = new Map<string, Set<(update: CellUpdate | CellFocus) => void>>();
  private connectionStatus = new Map<string, string>();
  
  // Simple reconnection state
  private retryCount = new Map<string, number>();
  private retryTimeout = new Map<string, NodeJS.Timeout>();
  private isCleaningUp = new Map<string, boolean>();
  
  // Debouncing for typing fields
  private debouncedBroadcasts = new Map<string, NodeJS.Timeout>();
  private pendingBroadcasts = new Map<string, CellUpdate>();
  
  // Adaptive batching
  private activeUserCount = 1;
  private readonly BASE_TYPING_DEBOUNCE_MS = 300;
  private readonly DEBOUNCE_PER_USER_MS = 50;
  private readonly MAX_TYPING_DEBOUNCE_MS = 1000;
  private readonly MAX_RETRIES = 10;
  
  // Health monitoring
  private lastBroadcastReceivedAt = new Map<string, number>();
  private broadcastSuccessCount = new Map<string, number>();
  private broadcastFailureCount = new Map<string, number>();

  constructor() {
    // Handle tab visibility
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      
      this.channels.forEach((_, rundownId) => {
        const status = this.connectionStatus.get(rundownId);
        if (status !== 'SUBSCRIBED') {
          console.log('👁️ Tab visible - cell channel unhealthy, reconnecting:', rundownId);
          this.forceReconnect(rundownId);
        }
      });
    });

    // Handle network online
    window.addEventListener('online', () => {
      console.log('🌐 Network online - clearing cell retry counts');
      this.retryCount.clear();
    });
  }

  private ensureChannel(rundownId: string): any {
    if (this.channels.has(rundownId)) {
      return this.channels.get(rundownId);
    }

    const channel = supabase.channel(`rundown-cells-${rundownId}`, {
      config: { broadcast: { self: true } }
    });

    channel
      .on('broadcast', { event: 'cell_update' }, (payload: { payload: CellUpdate }) => {
        const update = payload?.payload;
        if (!update || update.rundownId !== rundownId) return;
        
        this.lastBroadcastReceivedAt.set(rundownId, Date.now());
        
        const cbs = this.callbacks.get(rundownId);
        if (cbs) {
          cbs.forEach(cb => {
            try { cb(update); } catch (e) { console.warn('Cell callback error', e); }
          });
        }
      })
      .on('broadcast', { event: 'cell_focus' }, (payload: { payload: CellFocus }) => {
        const focus = payload?.payload;
        if (!focus || focus.rundownId !== rundownId) return;
        
        const cbs = this.callbacks.get(rundownId);
        if (cbs) {
          cbs.forEach(cb => {
            try { cb(focus); } catch (e) { console.warn('Cell focus callback error', e); }
          });
        }
      });

    // Store channel BEFORE subscribing so callback can check identity
    this.channels.set(rundownId, channel);

    channel.subscribe((status: string) => {
      // Ignore callbacks from old channels
      if (this.channels.get(rundownId) !== channel) {
        console.log('🔌 Ignoring callback from old channel (cell)');
        return;
      }

      this.connectionStatus.set(rundownId, status);
      const isConnected = status === 'SUBSCRIBED';
      simpleConnectionHealth.setCellConnected(rundownId, isConnected);

      if (status === 'SUBSCRIBED') {
        console.log('✅ Cell channel connected:', rundownId);
        this.retryCount.delete(rundownId);
        this.clearRetryTimeout(rundownId);
        this.broadcastFailureCount.set(rundownId, 0);
        simpleConnectionHealth.clearIntentionalReconnect(rundownId);
        
        if (simpleConnectionHealth.areAllChannelsHealthy(rundownId)) {
          simpleConnectionHealth.resetFailures(rundownId);
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (this.isCleaningUp.get(rundownId)) return;
        
        console.warn('🔌 Cell channel issue:', rundownId, status);
        this.scheduleRetry(rundownId);
      }
    });

    return channel;
  }

  private scheduleRetry(rundownId: string): void {
    const count = this.retryCount.get(rundownId) || 0;
    
    if (count >= this.MAX_RETRIES) {
      console.error(`🚨 Cell ${rundownId}: Max retries reached`);
      return;
    }

    this.clearRetryTimeout(rundownId);

    const delay = Math.min(1000 * Math.pow(2, count), 30000);
    this.retryCount.set(rundownId, count + 1);

    console.log(`🔌 Cell: Retry ${count + 1}/${this.MAX_RETRIES} in ${delay}ms`);

    const timeout = setTimeout(() => {
      this.retryTimeout.delete(rundownId);
      this.forceReconnect(rundownId);
    }, delay);
    
    this.retryTimeout.set(rundownId, timeout);
  }

  private clearRetryTimeout(rundownId: string): void {
    const timeout = this.retryTimeout.get(rundownId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeout.delete(rundownId);
    }
  }

  async forceReconnect(rundownId: string): Promise<void> {
    const isSessionValid = await authMonitor.isSessionValid();
    if (!isSessionValid) {
      console.log('🔐 Cell: Skipping reconnect - session expired');
      return;
    }

    console.log('📱 🔄 Force reconnecting cell channel:', rundownId);

    // Mark as intentional reconnect to suppress cosmetic failure logging
    simpleConnectionHealth.markIntentionalReconnect(rundownId);

    this.isCleaningUp.set(rundownId, true);
    this.clearRetryTimeout(rundownId);

    const existingChannel = this.channels.get(rundownId);
    if (existingChannel) {
      try {
        supabase.removeChannel(existingChannel);
      } catch (e) {
        console.warn('📱 Error removing channel:', e);
      }
    }
    
    this.channels.delete(rundownId);
    this.isCleaningUp.set(rundownId, false);

    if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
      this.ensureChannel(rundownId);
    }
  }

  async broadcastCellFocus(
    rundownId: string,
    itemId: string | null,
    field: string,
    userId: string,
    userName: string,
    tabId: string,
    isFocused: boolean
  ) {
    const channel = this.ensureChannel(rundownId);
    const focusPayload: CellFocus = {
      rundownId,
      itemId: itemId || undefined,
      field,
      userId,
      userName,
      tabId,
      isFocused,
      timestamp: Date.now()
    };

    try {
      await channel.send({
        type: 'broadcast',
        event: 'cell_focus',
        payload: focusPayload
      });
    } catch (error) {
      console.error('❌ Focus broadcast failed:', error);
    }
  }

  async broadcastCellUpdate(
    rundownId: string, 
    itemId: string | null, 
    field: string, 
    value: any, 
    userId: string,
    tabId: string
  ) {
    const channel = this.ensureChannel(rundownId);
    const updatePayload = {
      rundownId,
      itemId,
      field,
      value,
      userId,
      tabId,
      timestamp: Date.now()
    };

    try {
      await channel.send({
        type: 'broadcast',
        event: 'cell_update',
        payload: updatePayload
      });
      this.trackBroadcastSuccess(rundownId);
    } catch (error) {
      console.error('❌ Broadcast failed:', error);
      this.trackBroadcastFailure(rundownId);
      
      // Retry once
      setTimeout(() => this.retryBroadcast(rundownId, updatePayload), 1000);
    }
  }

  broadcastCellUpdateDebounced(
    rundownId: string,
    itemId: string | null,
    field: string,
    value: any,
    userId: string,
    tabId: string,
    debounceMs?: number
  ) {
    const adaptiveDebounce = debounceMs ?? this.getAdaptiveDebounceMs();
    const key = `${rundownId}-${itemId}-${field}`;
    
    const existingTimer = this.debouncedBroadcasts.get(key);
    if (existingTimer) clearTimeout(existingTimer);
    
    this.pendingBroadcasts.set(key, {
      rundownId,
      itemId,
      field,
      value,
      userId,
      tabId,
      timestamp: Date.now()
    });
    
    const timer = setTimeout(() => {
      const update = this.pendingBroadcasts.get(key);
      if (update) {
        this.broadcastCellUpdate(
          update.rundownId,
          update.itemId,
          update.field,
          update.value,
          update.userId,
          update.tabId
        );
        this.pendingBroadcasts.delete(key);
        this.debouncedBroadcasts.delete(key);
      }
    }, adaptiveDebounce);
    
    this.debouncedBroadcasts.set(key, timer);
  }
  
  private getAdaptiveDebounceMs(): number {
    const calculated = this.BASE_TYPING_DEBOUNCE_MS + (this.activeUserCount * this.DEBOUNCE_PER_USER_MS);
    return Math.min(calculated, this.MAX_TYPING_DEBOUNCE_MS);
  }
  
  setActiveUserCount(count: number): void {
    this.activeUserCount = Math.max(1, count);
  }
  
  getCurrentDebounceMs(): number {
    return this.getAdaptiveDebounceMs();
  }
  
  flushPendingBroadcasts(rundownId?: string) {
    const keysToFlush = rundownId 
      ? Array.from(this.debouncedBroadcasts.keys()).filter(k => k.startsWith(rundownId))
      : Array.from(this.debouncedBroadcasts.keys());
    
    keysToFlush.forEach(key => {
      const timer = this.debouncedBroadcasts.get(key);
      if (timer) clearTimeout(timer);
      
      const update = this.pendingBroadcasts.get(key);
      if (update) {
        this.broadcastCellUpdate(
          update.rundownId,
          update.itemId,
          update.field,
          update.value,
          update.userId,
          update.tabId
        );
      }
      
      this.debouncedBroadcasts.delete(key);
      this.pendingBroadcasts.delete(key);
    });
  }

  isOwnUpdate(update: any, currentTabId: string): boolean {
    return update.tabId === currentTabId;
  }

  subscribeToCellUpdates(rundownId: string, callback: (update: CellUpdate | CellFocus) => void, currentTabId?: string) {
    if (!this.callbacks.has(rundownId)) {
      this.callbacks.set(rundownId, new Set());
    }
    
    this.callbacks.get(rundownId)!.add(callback);
    this.ensureChannel(rundownId);

    return () => {
      const set = this.callbacks.get(rundownId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.callbacks.delete(rundownId);
          this.cleanupChannel(rundownId);
        }
      }
    };
  }
  
  private cleanupChannel(rundownId: string): void {
    this.isCleaningUp.set(rundownId, true);
    this.clearRetryTimeout(rundownId);
    this.retryCount.delete(rundownId);

    const ch = this.channels.get(rundownId);
    if (ch) {
      this.channels.delete(rundownId);
      
      setTimeout(() => {
        try {
          supabase.removeChannel(ch);
        } catch (e) {
          console.warn('🧹 Error during cell channel cleanup:', e);
        }
        this.isCleaningUp.delete(rundownId);
      }, 100);
    } else {
      this.isCleaningUp.delete(rundownId);
    }
  }

  private trackBroadcastSuccess(rundownId: string) {
    const count = this.broadcastSuccessCount.get(rundownId) || 0;
    this.broadcastSuccessCount.set(rundownId, count + 1);
  }
  
  private trackBroadcastFailure(rundownId: string) {
    const count = this.broadcastFailureCount.get(rundownId) || 0;
    this.broadcastFailureCount.set(rundownId, count + 1);
  }
  
  private async retryBroadcast(rundownId: string, payload: any) {
    try {
      const channel = this.channels.get(rundownId);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'cell_update',
          payload
        });
        this.trackBroadcastSuccess(rundownId);
      }
    } catch (error) {
      console.error('❌ Broadcast retry failed:', error);
      this.trackBroadcastFailure(rundownId);
    }
  }
  
  getConnectionStatus(rundownId: string): string | null {
    return this.connectionStatus.get(rundownId) || null;
  }
  
  isChannelConnected(rundownId: string): boolean {
    return this.connectionStatus.get(rundownId) === 'SUBSCRIBED';
  }
  
  getLastBroadcastTime(rundownId: string): number {
    return this.lastBroadcastReceivedAt.get(rundownId) || 0;
  }
  
  isChannelStale(rundownId: string, maxAgeMs: number): boolean {
    const lastBroadcast = this.lastBroadcastReceivedAt.get(rundownId);
    if (!lastBroadcast) return false;
    return Date.now() - lastBroadcast > maxAgeMs;
  }

  isBroadcastHealthy(rundownId: string): boolean {
    const successes = this.broadcastSuccessCount.get(rundownId) || 0;
    const failures = this.broadcastFailureCount.get(rundownId) || 0;
    const total = successes + failures;
    
    if (total === 0) return true;
    
    const successRate = successes / total;
    return this.isChannelConnected(rundownId) && successRate >= 0.8;
  }
  
  getHealthMetrics(rundownId: string) {
    const successes = this.broadcastSuccessCount.get(rundownId) || 0;
    const failures = this.broadcastFailureCount.get(rundownId) || 0;
    const total = successes + failures;
    
    return {
      successes,
      failures,
      total,
      successRate: total > 0 ? successes / total : 1,
      isHealthy: this.isBroadcastHealthy(rundownId),
      isConnected: this.isChannelConnected(rundownId)
    };
  }

  cleanup(rundownId: string) {
    this.flushPendingBroadcasts(rundownId);
    this.callbacks.delete(rundownId);
    this.connectionStatus.delete(rundownId);
    this.broadcastSuccessCount.delete(rundownId);
    this.broadcastFailureCount.delete(rundownId);
    this.lastBroadcastReceivedAt.delete(rundownId);
    this.cleanupChannel(rundownId);
  }
}

export const cellBroadcast = new CellBroadcastManager();
