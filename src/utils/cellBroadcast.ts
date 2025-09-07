// Per-cell broadcast system using Supabase Realtime (simplified for single sessions)
import { supabase } from '@/integrations/supabase/client';

// Simplified message payload for single sessions
interface CellUpdate {
  rundownId: string;
  itemId?: string; // Optional - null for rundown-level properties
  field: string;
  value: any;
  userId: string;
  timestamp: number;
}

// Lightweight type for RealtimeChannel to avoid importing types directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimeChannel = any;

export class CellBroadcastManager {
  private channels: Map<string, any> = new Map();
  private callbacks = new Map<string, Set<(update: CellUpdate) => void>>();
  private subscribed = new Map<string, boolean>();
  
  constructor() {
    console.log('📱 CellBroadcast initialized (simplified for single sessions)');
  }

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
        console.log('📱 Cell broadcast received (simplified):', update);
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

  broadcastCellUpdate(
    rundownId: string, 
    itemId: string | null, 
    field: string, 
    value: any, 
    userId: string
  ) {
    const channel = this.ensureChannel(rundownId);
    const updatePayload = {
      rundownId,
      itemId,
      field,
      value,
      userId,
      timestamp: Date.now()
    };

    console.log('📡 Broadcasting cell update (simplified):', updatePayload);

    channel.send({
      type: 'broadcast',
      event: 'cell_update',
      payload: updatePayload
    });
  }

  // Simple echo prevention using userId (single session per user)
  isOwnUpdate(update: any, currentUserId: string): boolean {
    const isOwn = update.userId === currentUserId;
    if (isOwn) {
      console.log('📱 Identified own cell broadcast update via userId');
    }
    return isOwn;
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
            // Prevent recursive cleanup
            this.channels.delete(rundownId);
            this.subscribed.delete(rundownId);
            
            // Safe async cleanup  
            setTimeout(() => {
              try {
                supabase.removeChannel(ch);
                console.log('🧹 Cleaned up cell channel for rundown:', rundownId);
              } catch (error) {
                console.warn('🧹 Error during cell channel cleanup:', error);
              }
            }, 0);
          }
        }
      }
    };
  }

  cleanup(rundownId: string) {
    const ch = this.channels.get(rundownId);
    if (ch) {
      // Prevent recursive cleanup
      this.channels.delete(rundownId);
      this.subscribed.delete(rundownId);
      this.callbacks.delete(rundownId);
      
      // Safe async cleanup
      setTimeout(() => {
        try {
          supabase.removeChannel(ch);
          console.log('🧹 Cleaned up cell channel for rundown:', rundownId);
        } catch (error) {
          console.warn('🧹 Error during cell channel cleanup:', error);
        }
      }, 0);
    }
  }
}

export const cellBroadcast = new CellBroadcastManager();