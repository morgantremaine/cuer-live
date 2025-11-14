// Per-cell broadcast system using Supabase Realtime (simplified)
import { supabase } from '@/integrations/supabase/client';
import { debugLogger } from '@/utils/debugLogger';

// Simplified message payload
interface CellUpdate {
  rundownId: string;
  itemId?: string; // Optional - null for rundown-level properties
  field: string;
  value: any;
  userId: string;
  tabId: string; // Tab identifier for echo prevention
  timestamp: number;
}

// Focus event payload for active editor indicators
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

// Lightweight type for RealtimeChannel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimeChannel = any;

export class CellBroadcastManager {
  private channels: Map<string, any> = new Map();
  private callbacks = new Map<string, Set<(update: CellUpdate | CellFocus) => void>>();
  private subscribed = new Map<string, boolean>();
  private tabIds = new Map<string, string>(); // Store tabId for echo prevention

  constructor() {
    debugLogger.realtime('CellBroadcast initialized (simplified)');
  }

  private ensureChannel(rundownId: string): RealtimeChannel {
    const key = `rundown-cells-${rundownId}`;

    if (this.channels.has(rundownId)) {
      return this.channels.get(rundownId)!;
    }

    const channel = supabase.channel(key, {
      config: {
        broadcast: { self: true } // receive self messages too (caller can filter)
      }
    });

    channel
      .on('broadcast', { event: 'cell_update' }, (payload: { payload: CellUpdate }) => {
        const update = payload?.payload;
        if (!update || update.rundownId !== rundownId) {
          return;
        }
        
        // Each subscriber handles its own echo prevention via isOwnUpdate()
        const fieldKey = `${update.itemId || 'rundown'}-${update.field}`;
        debugLogger.realtime('Cell broadcast received:', { fieldKey, value: update.value });
        
        const cbs = this.callbacks.get(rundownId);
        if (cbs && cbs.size > 0) {
          cbs.forEach(cb => {
            try { cb(update); } catch (e) { console.warn('Cell callback error', e); }
          });
        }
      })
      .on('broadcast', { event: 'cell_focus' }, (payload: { payload: CellFocus }) => {
        const focus = payload?.payload;
        if (!focus || focus.rundownId !== rundownId) {
          return;
        }
        
        const fieldKey = `${focus.itemId || 'rundown'}-${focus.field}`;
        debugLogger.realtime('Cell focus broadcast received:', { fieldKey, isFocused: focus.isFocused, userName: focus.userName });
        
        const cbs = this.callbacks.get(rundownId);
        if (cbs && cbs.size > 0) {
          cbs.forEach(cb => {
            try { cb(focus); } catch (e) { console.warn('Cell focus callback error', e); }
          });
        }
      });

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        this.subscribed.set(rundownId, true);
        console.log('✅ Cell broadcast channel subscribed:', key);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.subscribed.set(rundownId, false);
        console.warn('🔌 Cell realtime channel error:', key, status);
      } else {
        console.log('ℹ️ Cell realtime channel status:', key, status);
      }
    });

    this.channels.set(rundownId, channel);
    return channel;
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

    debugLogger.realtime('Broadcasting cell focus:', focusPayload);

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

    debugLogger.realtime('Broadcasting cell update (instant):', updatePayload);

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

  // Echo prevention using tabId
  isOwnUpdate(update: any, currentTabId: string): boolean {
    return update.tabId === currentTabId;
  }

  subscribeToCellUpdates(rundownId: string, callback: (update: CellUpdate | CellFocus) => void, currentTabId?: string) {
    if (!this.callbacks.has(rundownId)) {
      this.callbacks.set(rundownId, new Set());
    }
    
    this.callbacks.get(rundownId)!.add(callback);

    // Ensure channel is created and subscribed
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

  cleanupChannel(rundownId: string) {
    const channel = this.channels.get(rundownId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(rundownId);
      this.subscribed.delete(rundownId);
      this.tabIds.delete(rundownId);
      
      debugLogger.realtime('Cleaned up cell channel:', rundownId);
    }
  }

  // Stub methods for backward compatibility - no-ops for simplified architecture
  broadcastCellUpdateDebounced(...args: any[]) {
    // Simplified: no debouncing, just call direct broadcast
    if (args.length >= 6) {
      return this.broadcastCellUpdate(args[0], args[1], args[2], args[3], args[4], args[5]);
    }
  }

  flushPendingBroadcasts(rundownId?: string) {
    // No-op: no pending broadcasts in simplified architecture
  }

  getHealthMetrics(rundownId: string) {
    // Simplified: always return healthy
    return {
      isHealthy: true,
      isConnected: this.subscribed.get(rundownId) || false,
      successRate: 1,
      total: 0
    };
  }
}

// Singleton instance
export const cellBroadcast = new CellBroadcastManager();
