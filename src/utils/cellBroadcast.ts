// Cell broadcast system - NUCLEAR RESET VERSION
// Simple channel management, no complex retry logic
// Recovery handled by realtimeReset.ts nuclear reset

import { supabase } from '@/integrations/supabase/client';
import { debugLogger } from '@/utils/debugLogger';
import { simpleConnectionHealth } from '@/services/SimpleConnectionHealth';

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

  // Generation tracking to ignore stale callbacks after nuclear reset
  private channelGeneration = new Map<string, number>();

  // Debouncing for typing fields
  private debouncedBroadcasts = new Map<string, NodeJS.Timeout>();
  private pendingBroadcasts = new Map<string, CellUpdate>();

  // Adaptive batching
  private activeUserCount = 1;
  private readonly BASE_TYPING_DEBOUNCE_MS = 300;
  private readonly DEBOUNCE_PER_USER_MS = 50;
  private readonly MAX_TYPING_DEBOUNCE_MS = 1000;

  // Health monitoring
  private lastBroadcastReceivedAt = new Map<string, number>();

  private ensureChannel(rundownId: string): any {
    if (this.channels.has(rundownId)) {
      return this.channels.get(rundownId);
    }

    // Increment generation for this channel
    const generation = (this.channelGeneration.get(rundownId) || 0) + 1;
    this.channelGeneration.set(rundownId, generation);

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

    this.channels.set(rundownId, channel);

    // Capture generation at subscribe time for stale callback detection
    const subscribedGeneration = generation;

    channel.subscribe((status: string) => {
      // Ignore callbacks from old channels - check BOTH reference AND generation
      if (this.channels.get(rundownId) !== channel) {
        console.log('🔌 Cell: ignoring stale callback (channel reference mismatch)');
        return;
      }
      if (this.channelGeneration.get(rundownId) !== subscribedGeneration) {
        console.log('🔌 Cell: ignoring stale callback (generation mismatch:', subscribedGeneration, 'vs', this.channelGeneration.get(rundownId), ')');
        return;
      }

      this.connectionStatus.set(rundownId, status);
      const isConnected = status === 'SUBSCRIBED';
      simpleConnectionHealth.setCellConnected(rundownId, isConnected);

      if (status === 'SUBSCRIBED') {
        console.log('✅ Cell channel connected:', rundownId);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('🔌 Cell channel issue:', rundownId, status);
        // No retry - nuclear reset will handle recovery
      }
    });

    return channel;
  }

  // Called after nuclear reset to re-establish channel
  reinitialize(rundownId: string): void {
    if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
      console.log('🔌 Reinitializing cell channel after nuclear reset');
      this.channels.delete(rundownId);
      this.connectionStatus.delete(rundownId);
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
    } catch (error) {
      console.error('❌ Broadcast failed:', error);
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
    const ch = this.channels.get(rundownId);
    if (ch) {
      this.channels.delete(rundownId);

      setTimeout(() => {
        try {
          supabase.removeChannel(ch);
        } catch (e) {
          console.warn('🧹 Error during cell channel cleanup:', e);
        }
      }, 100);
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

  isBroadcastHealthy(rundownId: string): boolean {
    return this.isChannelConnected(rundownId);
  }

  cleanup(rundownId: string) {
    this.flushPendingBroadcasts(rundownId);
    this.callbacks.delete(rundownId);
    this.connectionStatus.delete(rundownId);
    this.lastBroadcastReceivedAt.delete(rundownId);
    this.cleanupChannel(rundownId);
  }

  // Memory diagnostics stats
  getStats() {
    let totalCallbacks = 0;
    this.callbacks.forEach(set => totalCallbacks += set.size);

    return {
      channelCount: this.channels.size,
      callbackCount: totalCallbacks,
      pendingBroadcasts: this.pendingBroadcasts.size,
      debouncedBroadcasts: this.debouncedBroadcasts.size,
      connectionStatuses: Object.fromEntries(this.connectionStatus),
      channelGenerations: Object.fromEntries(this.channelGeneration),
      activeUserCount: this.activeUserCount,
      currentDebounceMs: this.getAdaptiveDebounceMs(),
    };
  }
}

export const cellBroadcast = new CellBroadcastManager();
