// Per-cell broadcast system using Supabase Realtime (works across tabs, browsers, and devices)
import { supabase } from '@/integrations/supabase/client';

// Per-cell message payload
interface CellUpdate {
  rundownId: string;
  itemId: string;
  field: string;
  value: any;
  userId: string;
  timestamp: number;
}

// Lightweight type for RealtimeChannel to avoid importing types directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimeChannel = any;

class CellBroadcastManager {
  private channels = new Map<string, RealtimeChannel>();
  private callbacks = new Map<string, Set<(update: CellUpdate) => void>>();
  private subscribed = new Map<string, boolean>();

  private ensureChannel(rundownId: string): RealtimeChannel {
    const key = `rundown-cells-${rundownId}`;

    if (this.channels.has(rundownId)) {
      const ch = this.channels.get(rundownId)!;
      return ch;
    }

    const channel = supabase.channel(key, {
      config: {
        broadcast: { self: true } // receive self messages too (caller can filter)
      }
    });

    channel
      .on('broadcast', { event: 'cell_update' }, (payload: { payload: CellUpdate }) => {
        const update = payload?.payload;
        if (!update || update.rundownId !== rundownId) return;
        // Debug log for diagnostics
        console.log('📱 Cell broadcast received (supabase):', update);
        const cbs = this.callbacks.get(rundownId);
        if (cbs && cbs.size > 0) {
          cbs.forEach(cb => {
            try { cb(update); } catch (e) { console.warn('Cell callback error', e); }
          });
        }
      });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        this.subscribed.set(rundownId, true);
        console.log('✅ Cell realtime channel subscribed:', key);
      } else {
        console.log('ℹ️ Cell realtime channel status:', key, status);
      }
    });

    this.channels.set(rundownId, channel);
    return channel;
  }

  broadcastCellUpdate(rundownId: string, itemId: string, field: string, value: any, userId: string) {
    const channel = this.ensureChannel(rundownId);
    const update: CellUpdate = {
      rundownId,
      itemId,
      field,
      value,
      userId,
      timestamp: Date.now()
    };

    console.log('📡 Broadcasting cell update (supabase):', update);

    channel.send({
      type: 'broadcast',
      event: 'cell_update',
      payload: update
    });
  }

  subscribeToCellUpdates(rundownId: string, callback: (update: CellUpdate) => void) {
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
          const ch = this.channels.get(rundownId);
          if (ch) {
            try {
              supabase.removeChannel(ch);
            } catch {}
            this.channels.delete(rundownId);
            this.subscribed.delete(rundownId);
            console.log('🧹 Cleaned up cell channel for rundown:', rundownId);
          }
        }
      }
    };
  }

  cleanup(rundownId: string) {
    const ch = this.channels.get(rundownId);
    if (ch) {
      try {
        supabase.removeChannel(ch);
      } catch {}
      this.channels.delete(rundownId);
      this.subscribed.delete(rundownId);
    }
    this.callbacks.delete(rundownId);
  }
}

export const cellBroadcast = new CellBroadcastManager();
