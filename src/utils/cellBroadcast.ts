// Per-cell broadcast system using Supabase Realtime (simplified for single sessions)
import { supabase } from '@/integrations/supabase/client';
import { getReconnectDelay } from '@/utils/realtimeUtils';

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
  private reconnectAttempts = new Map<string, number>();
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private lastProcessedUpdate = new Map<string, string>();
  
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
        
        // Deduplication based on content hash
        const updateKey = `${update.itemId || 'rundown'}-${update.field}-${JSON.stringify(update.value)}-${update.timestamp}`;
        const lastKey = this.lastProcessedUpdate.get(rundownId);
        
        if (lastKey === updateKey) {
          return; // Skip duplicate update
        }
        
        this.lastProcessedUpdate.set(rundownId, updateKey);
        
        // Reduced logging for cell broadcasts - only show unique updates
        if (lastKey !== updateKey) {
          console.log('📱 Cell broadcast received (simplified):', update);
        }
        
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
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Avoid manual reconnect loops; rely on Supabase auto-reconnect
        this.subscribed.set(rundownId, false);
        console.warn('🔌 Cell realtime channel status (no manual reconnect):', key, status);
      } else {
        console.log('ℹ️ Cell realtime channel status:', key, status);
      }
    });

    this.channels.set(rundownId, channel);
    return channel;
  }

  private handleChannelReconnect(rundownId: string): void {
    // Clear any existing reconnect timeout
    const existingTimeout = this.reconnectTimeouts.get(rundownId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const attempts = this.reconnectAttempts.get(rundownId) || 0;
    this.reconnectAttempts.set(rundownId, attempts + 1);

    // Use exponential backoff from realtimeUtils
    const delay = getReconnectDelay(attempts);

    console.log(`🔌 Cell channel disconnected, reconnecting in ${delay}ms (attempt ${attempts + 1})`);

    const timeout = setTimeout(() => {
      this.reconnectTimeouts.delete(rundownId);
      
      // Remove and recreate the channel
      const oldChannel = this.channels.get(rundownId);
      if (oldChannel) {
        try {
          supabase.removeChannel(oldChannel);
        } catch (error) {
          console.warn('Error removing old channel during reconnect:', error);
        }
      }
      
      this.channels.delete(rundownId);
      this.subscribed.delete(rundownId);
      
      // Recreate channel if callbacks still exist
      if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
        this.ensureChannel(rundownId);
      }
    }, delay);

    this.reconnectTimeouts.set(rundownId, timeout);
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
          this.cleanupChannel(rundownId);
        }
      }
    };
  }

  private cleanupChannel(rundownId: string): void {
    // Clear reconnect attempts and timeouts
    this.reconnectAttempts.delete(rundownId);
    const timeout = this.reconnectTimeouts.get(rundownId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(rundownId);
    }

    const ch = this.channels.get(rundownId);
    if (ch) {
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

  cleanup(rundownId: string) {
    this.callbacks.delete(rundownId);
    this.cleanupChannel(rundownId);
  }
}

export const cellBroadcast = new CellBroadcastManager();