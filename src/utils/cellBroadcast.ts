// Per-cell broadcast system using Supabase Realtime (simplified for single sessions)
import { supabase } from '@/integrations/supabase/client';
import { getReconnectDelay } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { realtimeReconnectionCoordinator } from '@/services/RealtimeReconnectionCoordinator';

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
  private userIds = new Map<string, string>(); // Store userId for early filtering
  
  // Health monitoring
  private connectionStatus = new Map<string, string>();
  private broadcastSuccessCount = new Map<string, number>();
  private broadcastFailureCount = new Map<string, number>();
  private lastHealthCheck = new Map<string, number>();
  private healthyThreshold = 0.8; // 80% success rate required
  private healthCheckInterval = 30000; // 30 seconds
  
  constructor() {
    debugLogger.realtime('CellBroadcast initialized (simplified for single sessions)');
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
        
        // EARLY FILTERING: Skip own messages immediately to prevent memory bloat
        const currentUserId = this.userIds.get(rundownId);
        if (currentUserId && update.userId === currentUserId) {
          // Skip all expensive operations for own messages
          return;
        }
        
        // REMOVED: Deduplication window - accept all updates immediately
        // React's rendering optimization handles duplicate renders efficiently
        const fieldKey = `${update.itemId || 'rundown'}-${update.field}`;
        debugLogger.realtime('Cell broadcast received (from other user):', { fieldKey, value: update.value });
        
        
        const cbs = this.callbacks.get(rundownId);
        if (cbs && cbs.size > 0) {
          cbs.forEach(cb => {
            try { cb(update); } catch (e) { console.warn('Cell callback error', e); }
          });
        }
      });

    channel.subscribe(async (status: string) => {
      this.connectionStatus.set(rundownId, status);
      
      if (status === 'SUBSCRIBED') {
        this.subscribed.set(rundownId, true);
        // Reset failure count on successful connection
        this.broadcastFailureCount.set(rundownId, 0);
        console.log('✅ Cell realtime channel subscribed:', key);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.subscribed.set(rundownId, false);
        console.warn('🔌 Cell realtime channel error:', key, status);
        
        // Track connection failures for health monitoring
        const failures = this.broadcastFailureCount.get(rundownId) || 0;
        this.broadcastFailureCount.set(rundownId, failures + 1);
        
        // Retry ONCE on CHANNEL_ERROR if auth session is valid
        // (Coordinator handles systematic reconnection)
        if (status === 'CHANNEL_ERROR') {
          const failures = this.broadcastFailureCount.get(rundownId) || 0;
          
          // Only retry once, then rely on coordinator
          if (failures <= 1) {
            console.log('🔄 Cell channel error - checking session for one-time retry...');
            const { data: { session }, error } = await supabase.auth.getSession();
            if (!error && session) {
              console.log('✅ Valid session found - retrying cell connection once in 2s');
              setTimeout(() => {
                this.forceReconnect(rundownId);
              }, 2000);
            }
          } else {
            console.log('⏭️ Cell channel error - waiting for coordinator to handle reconnection');
          }
        }
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

  async broadcastCellUpdate(
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

    debugLogger.realtime('Broadcasting cell update (instant):', updatePayload);

    try {
      await channel.send({
        type: 'broadcast',
        event: 'cell_update',
        payload: updatePayload
      });
      
      // Track successful broadcast
      this.trackBroadcastSuccess(rundownId);
    } catch (error) {
      console.error('❌ Broadcast failed:', error);
      
      // Track failure
      this.trackBroadcastFailure(rundownId);
      
      // Retry once after short delay
      setTimeout(() => {
        this.retryBroadcast(rundownId, updatePayload);
      }, 1000);
    }
  }

  // Simple echo prevention using userId (single session per user)
  isOwnUpdate(update: any, currentUserId: string): boolean {
    const isOwn = update.userId === currentUserId;
    if (isOwn) {
      console.log('📱 Identified own cell broadcast update via userId');
    }
    return isOwn;
  }

  subscribeToCellUpdates(rundownId: string, callback: (update: CellUpdate) => void, currentUserId?: string) {
    if (!this.callbacks.has(rundownId)) {
      this.callbacks.set(rundownId, new Set());
    }
    this.callbacks.get(rundownId)!.add(callback);

    // Store userId for early filtering (if provided)
    if (currentUserId) {
      this.userIds.set(rundownId, currentUserId);
    }

    // Ensure channel is created and subscribed
    this.ensureChannel(rundownId);
    
    // Register with reconnection coordinator
    realtimeReconnectionCoordinator.register(
      `cell-${rundownId}`,
      'cell',
      () => this.forceReconnect(rundownId)
    );

    return () => {
      const set = this.callbacks.get(rundownId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.callbacks.delete(rundownId);
          // Unregister from coordinator
          realtimeReconnectionCoordinator.unregister(`cell-${rundownId}`);
          this.cleanupChannel(rundownId);
        }
      }
    };
  }
  
  // Force reconnection (called by RealtimeReconnectionCoordinator)
  async forceReconnect(rundownId: string): Promise<void> {
    console.log('📱 🔄 Force reconnect requested for cell channel:', rundownId);
    
    // Check auth first
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      console.warn('📱 ⚠️ Cannot reconnect cell channel - invalid auth session');
      return;
    }
    
    // Clean up and reconnect immediately
    const existingChannel = this.channels.get(rundownId);
    if (existingChannel) {
      try {
        supabase.removeChannel(existingChannel);
      } catch (error) {
        console.warn('📱 Error removing cell channel during force reconnect:', error);
      }
    }
    
    this.channels.delete(rundownId);
    this.subscribed.delete(rundownId);
    this.reconnectAttempts.set(rundownId, 0); // Reset attempts
    
    if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
      this.ensureChannel(rundownId);
    }
  }

  private cleanupChannel(rundownId: string): void {
    // Clear reconnect attempts and timeouts
    this.reconnectAttempts.delete(rundownId);
    const timeout = this.reconnectTimeouts.get(rundownId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(rundownId);
    }

    // Clear userId for early filtering
    this.userIds.delete(rundownId);

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

  // Health monitoring methods
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
        console.log('✅ Broadcast retry succeeded');
        this.trackBroadcastSuccess(rundownId);
      }
    } catch (error) {
      console.error('❌ Broadcast retry failed:', error);
      this.trackBroadcastFailure(rundownId);
    }
  }
  
  // Get connection status for health monitoring
  getConnectionStatus(rundownId: string): string | null {
    return this.connectionStatus.get(rundownId) || null;
  }
  
  // Check if channel is connected
  isChannelConnected(rundownId: string): boolean {
    return this.connectionStatus.get(rundownId) === 'SUBSCRIBED';
  }
  
  // Check broadcast health
  isBroadcastHealthy(rundownId: string): boolean {
    const successes = this.broadcastSuccessCount.get(rundownId) || 0;
    const failures = this.broadcastFailureCount.get(rundownId) || 0;
    const total = successes + failures;
    
    // Consider healthy if no attempts yet or success rate above threshold
    if (total === 0) return true;
    
    const successRate = successes / total;
    const isConnected = this.isChannelConnected(rundownId);
    
    return isConnected && successRate >= this.healthyThreshold;
  }
  
  // Get health metrics for monitoring
  getHealthMetrics(rundownId: string) {
    const successes = this.broadcastSuccessCount.get(rundownId) || 0;
    const failures = this.broadcastFailureCount.get(rundownId) || 0;
    const total = successes + failures;
    const successRate = total > 0 ? successes / total : 1;
    
    return {
      successes,
      failures,
      total,
      successRate,
      isHealthy: this.isBroadcastHealthy(rundownId),
      isConnected: this.isChannelConnected(rundownId)
    };
  }

  cleanup(rundownId: string) {
    this.callbacks.delete(rundownId);
    this.userIds.delete(rundownId);
    
    // Clean up health monitoring data
    this.connectionStatus.delete(rundownId);
    this.broadcastSuccessCount.delete(rundownId);
    this.broadcastFailureCount.delete(rundownId);
    this.lastHealthCheck.delete(rundownId);
    
    this.cleanupChannel(rundownId);
  }
}

export const cellBroadcast = new CellBroadcastManager();