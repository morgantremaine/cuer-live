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
  tabId: string; // Tab identifier for echo prevention (allows multiple tabs per user)
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

// Lightweight type for RealtimeChannel to avoid importing types directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimeChannel = any;

export class CellBroadcastManager {
  private channels: Map<string, any> = new Map();
  private callbacks = new Map<string, Set<(update: CellUpdate | CellFocus) => void>>();
  private subscribed = new Map<string, boolean>();
  private reconnectAttempts = new Map<string, number>();
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private lastProcessedUpdate = new Map<string, string>();
  private tabIds = new Map<string, string>(); // Store tabId for echo prevention (supports multiple tabs per user)
  private reconnecting = new Map<string, boolean>(); // Guard against reconnection storms
  
  // Debouncing for typing fields
  private debouncedBroadcasts = new Map<string, NodeJS.Timeout>();
  private pendingBroadcasts = new Map<string, CellUpdate>();
  private readonly TYPING_DEBOUNCE_MS = 300; // 300ms debounce for typing
  
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
        if (!update || update.rundownId !== rundownId) {
          return;
        }
        
        // Each subscriber handles its own echo prevention via isOwnUpdate()
        // This allows multiple subscribers (main rundown + teleprompter) to work correctly
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
      this.connectionStatus.set(rundownId, status);
      
      // Guard: Skip if already reconnecting to prevent feedback loop
      if (this.reconnecting.get(rundownId) && status !== 'SUBSCRIBED') {
        console.log('⏭️ Skipping cell reconnect - already reconnecting:', rundownId);
        return;
      }
      
      if (status === 'SUBSCRIBED') {
        this.subscribed.set(rundownId, true);
        // Reset failure count and clear guard flag on successful connection
        this.broadcastFailureCount.set(rundownId, 0);
        this.reconnectAttempts.delete(rundownId);
        this.reconnecting.delete(rundownId);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.subscribed.set(rundownId, false);
        console.warn('🔌 Cell realtime channel error:', key, status);
        
        // Track connection failures for health monitoring
        const failures = this.broadcastFailureCount.get(rundownId) || 0;
        this.broadcastFailureCount.set(rundownId, failures + 1);
        
        // Direct reconnection with exponential backoff
        this.handleChannelReconnect(rundownId);
      } else {
        console.log('ℹ️ Cell realtime channel status:', key, status);
      }
    });

    this.channels.set(rundownId, channel);
    return channel;
  }

  private handleChannelReconnect(rundownId: string): void {
    // Set guard flag immediately to prevent feedback loop
    this.reconnecting.set(rundownId, true);
    
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

  // Debounced broadcast for typing fields
  broadcastCellUpdateDebounced(
    rundownId: string,
    itemId: string | null,
    field: string,
    value: any,
    userId: string,
    tabId: string,
    debounceMs: number = this.TYPING_DEBOUNCE_MS
  ) {
    const key = `${rundownId}-${itemId}-${field}`;
    
    // Clear existing debounce timer for this field
    const existingTimer = this.debouncedBroadcasts.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Store the latest value
    this.pendingBroadcasts.set(key, {
      rundownId,
      itemId,
      field,
      value,
      userId,
      tabId,
      timestamp: Date.now()
    });
    
    debugLogger.realtime('Debouncing cell update:', { key, debounceMs });
    
    // Schedule the broadcast
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
    }, debounceMs);
    
    this.debouncedBroadcasts.set(key, timer);
  }
  
  // Flush all pending broadcasts immediately (for cleanup)
  flushPendingBroadcasts(rundownId?: string) {
    const keysToFlush = rundownId 
      ? Array.from(this.debouncedBroadcasts.keys()).filter(k => k.startsWith(rundownId))
      : Array.from(this.debouncedBroadcasts.keys());
    
    debugLogger.realtime('Flushing pending broadcasts:', { count: keysToFlush.length, rundownId });
    
    keysToFlush.forEach(key => {
      const timer = this.debouncedBroadcasts.get(key);
      if (timer) {
        clearTimeout(timer);
      }
      
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

  // Echo prevention using tabId (supports multiple tabs per user)
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
    
    // Set guard flag to prevent feedback loop
    this.reconnecting.set(rundownId, true);
    
    // Check auth first
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      console.warn('📱 ⚠️ Cannot reconnect cell channel - invalid auth session');
      this.reconnecting.delete(rundownId); // Clear flag on auth failure
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

    // Clear tabId for early filtering
    this.tabIds.delete(rundownId);

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
    // Flush any pending broadcasts before cleanup
    this.flushPendingBroadcasts(rundownId);
    
    this.callbacks.delete(rundownId);
    this.tabIds.delete(rundownId);
    
    // Clean up health monitoring data
    this.connectionStatus.delete(rundownId);
    this.broadcastSuccessCount.delete(rundownId);
    this.broadcastFailureCount.delete(rundownId);
    this.lastHealthCheck.delete(rundownId);
    
    this.cleanupChannel(rundownId);
  }
}

export const cellBroadcast = new CellBroadcastManager();