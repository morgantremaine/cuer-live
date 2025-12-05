// Per-cell broadcast system using Supabase Realtime (simplified for single sessions)
import { supabase } from '@/integrations/supabase/client';
import { getReconnectDelay } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { unifiedConnectionHealth } from '@/services/UnifiedConnectionHealth';
import { authMonitor } from '@/services/AuthMonitor';
import { toast } from 'sonner';

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
  private reconnectGuardTimeouts = new Map<string, NodeJS.Timeout>();
  private reconnectStartTimes = new Map<string, number>();
  private lastReconnectTimes = new Map<string, number>(); // Debounce reconnection attempts
  
  // Debouncing for typing fields
  private debouncedBroadcasts = new Map<string, NodeJS.Timeout>();
  private pendingBroadcasts = new Map<string, CellUpdate>();
  private readonly BASE_TYPING_DEBOUNCE_MS = 300; // 300ms base debounce for typing
  private readonly RECONNECT_TIMEOUT_MS = 15000; // 15 second timeout for stuck reconnections
  private readonly MIN_RECONNECT_INTERVAL_MS = 5000; // 5 second minimum between reconnection attempts
  
  // Adaptive batching based on user count
  private activeUserCount = 1;
  private readonly DEBOUNCE_PER_USER_MS = 50; // Add 50ms per user
  private readonly MAX_TYPING_DEBOUNCE_MS = 1000; // Cap at 1 second
  
  // Health monitoring
  private connectionStatus = new Map<string, string>();
  private broadcastSuccessCount = new Map<string, number>();
  private broadcastFailureCount = new Map<string, number>();
  private lastHealthCheck = new Map<string, number>();
  private healthyThreshold = 0.8; // 80% success rate required
  private healthCheckInterval = 30000; // 30 seconds
  
  // Broadcast timing tracking for teleprompter health monitoring
  private lastBroadcastReceivedAt = new Map<string, number>();
  
  // Auth state tracking
  private sessionExpired = false;
  
  constructor() {
    debugLogger.realtime('CellBroadcast initialized (simplified for single sessions)');
    
    // Listen for network online events to clear stale reconnecting flags
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Network online - clearing stale cell reconnection guards');
        // Clear all reconnecting flags to allow immediate reconnection
        this.reconnecting.clear();
        this.reconnectStartTimes.clear();
        this.lastReconnectTimes.clear(); // Allow immediate reconnection after network restore
        // Clear guard timeouts
        this.reconnectGuardTimeouts.forEach(timeout => clearTimeout(timeout));
        this.reconnectGuardTimeouts.clear();
      });

      // CRITICAL: Listen for auth state changes to stop reconnection on session expiry
      authMonitor.registerListener('cell-broadcast', (session) => {
        if (!session) {
          console.log('🔐 CellBroadcast: Session expired - stopping all reconnection attempts');
          this.sessionExpired = true;
          // Clear all pending reconnection timeouts
          this.reconnectTimeouts.forEach((timeout, rundownId) => {
            clearTimeout(timeout);
            console.log(`🔐 Cleared cell reconnect timeout for: ${rundownId}`);
          });
          this.reconnectTimeouts.clear();
          this.reconnectAttempts.clear();
          this.reconnecting.clear();
          this.reconnectGuardTimeouts.forEach(timeout => clearTimeout(timeout));
          this.reconnectGuardTimeouts.clear();
        } else {
          console.log('🔐 CellBroadcast: Session restored - allowing reconnection');
          this.sessionExpired = false;
        }
      });
    }
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
        
        // Track broadcast receipt time for health monitoring
        this.lastBroadcastReceivedAt.set(rundownId, Date.now());
        
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
      
      // Update unified health service with current status
      const isConnected = status === 'SUBSCRIBED';
      unifiedConnectionHealth.setCellStatus(rundownId, isConnected);
      
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
        // CRITICAL: Don't clear lastReconnectTimes - let debounce window expire naturally
        // This prevents orphan timeouts from firing immediately after success
        
        // Clear any pending scheduled reconnection timeouts
        const pendingTimeout = this.reconnectTimeouts.get(rundownId);
        if (pendingTimeout) {
          clearTimeout(pendingTimeout);
          this.reconnectTimeouts.delete(rundownId);
        }
        
        // Check if ALL channels are now healthy and reset global failure count
        if (unifiedConnectionHealth.areAllChannelsHealthy(rundownId)) {
          console.log('🔌 All channels healthy - resetting global failure count');
          unifiedConnectionHealth.resetFailures(rundownId);
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.subscribed.set(rundownId, false);
        console.warn('🔌 Cell realtime channel error:', key, status, {
          navigator_online: navigator.onLine,
          document_hidden: document.hidden,
          timestamp: new Date().toISOString(),
          reconnecting: this.reconnecting.get(rundownId),
          reconnectAttempts: this.reconnectAttempts.get(rundownId),
          callbacksCount: this.callbacks.get(rundownId)?.size || 0
        });
        
        // Track connection failures for health monitoring
        const failures = this.broadcastFailureCount.get(rundownId) || 0;
        this.broadcastFailureCount.set(rundownId, failures + 1);
        
        // Track in unified health service (it handles global threshold and page reload)
        unifiedConnectionHealth.trackFailure(rundownId);
        
        // Trigger reconnection with exponential backoff
        const attempts = this.reconnectAttempts.get(rundownId) || 0;
        this.reconnectAttempts.set(rundownId, attempts + 1);
        const delay = Math.min(2000 * Math.pow(1.5, attempts), 30000); // Max 30s (consistent with other channels)
        console.log(`🔌 Scheduling cell reconnection in ${delay}ms (attempt ${attempts + 1})`);
        
        // Store timeout so we can clear it on success
        const existingTimeout = this.reconnectTimeouts.get(rundownId);
        if (existingTimeout) clearTimeout(existingTimeout);
        const timeout = setTimeout(() => {
          this.reconnectTimeouts.delete(rundownId);
          this.forceReconnect(rundownId);
        }, delay);
        this.reconnectTimeouts.set(rundownId, timeout);
      } else {
        console.log('ℹ️ Cell realtime channel status:', key, status);
      }
    });

    this.channels.set(rundownId, channel);
    return channel;
  }

  // Channel handles its own reconnection with exponential backoff

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

  // Debounced broadcast for typing fields with adaptive timing
  broadcastCellUpdateDebounced(
    rundownId: string,
    itemId: string | null,
    field: string,
    value: any,
    userId: string,
    tabId: string,
    debounceMs?: number
  ) {
    // Calculate adaptive debounce based on user count
    const adaptiveDebounce = debounceMs ?? this.getAdaptiveDebounceMs();
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
    
    debugLogger.realtime('Debouncing cell update:', { key, debounceMs: adaptiveDebounce, userCount: this.activeUserCount });
    
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
    }, adaptiveDebounce);
    
    this.debouncedBroadcasts.set(key, timer);
  }
  
  // Calculate adaptive debounce based on user count
  private getAdaptiveDebounceMs(): number {
    const calculated = this.BASE_TYPING_DEBOUNCE_MS + 
      (this.activeUserCount * this.DEBOUNCE_PER_USER_MS);
    return Math.min(calculated, this.MAX_TYPING_DEBOUNCE_MS);
  }
  
  // Set active user count for adaptive debouncing
  setActiveUserCount(count: number): void {
    this.activeUserCount = Math.max(1, count);
  }
  
  // Get current adaptive debounce for debugging
  getCurrentDebounceMs(): number {
    return this.getAdaptiveDebounceMs();
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
  
  // Force reconnection with debounce
  async forceReconnect(rundownId: string): Promise<void> {
    console.log('📱 🔄 Force reconnect requested for cell channel:', rundownId);
    
    // CRITICAL: Check if session expired - don't attempt reconnection with invalid auth
    if (this.sessionExpired) {
      console.log('🔐 CellBroadcast: Skipping reconnect - session expired');
      return;
    }
    
    // Debounce: prevent rapid reconnection attempts
    const now = Date.now();
    const lastReconnect = this.lastReconnectTimes.get(rundownId) || 0;
    if (now - lastReconnect < this.MIN_RECONNECT_INTERVAL_MS) {
      console.log(`⏭️ Skipping cell reconnect - too soon (${Math.round((now - lastReconnect)/1000)}s since last)`);
      return;
    }
    this.lastReconnectTimes.set(rundownId, now);
    
    // Check current connection status
    const currentStatus = this.connectionStatus.get(rundownId);
    const isReconnecting = this.reconnecting.get(rundownId);
    const startTime = this.reconnectStartTimes.get(rundownId);
    
    // CRITICAL FIX: If channel is definitely dead, bypass guard and reconnect immediately
    const isChannelDead = currentStatus === 'TIMED_OUT' || 
                          currentStatus === 'CLOSED' || 
                          currentStatus === 'CHANNEL_ERROR';
    
    if (isChannelDead) {
      // Channel is dead - clear any existing guard and proceed WITHOUT setting new guard
      console.log('📱 💀 Cell channel is dead, clearing guard and proceeding with immediate reconnect');
      this.clearReconnectingState(rundownId);
    } else if (isReconnecting && startTime) {
      // Only check guard for non-dead channels
      const timeSinceStart = Date.now() - startTime;
      if (timeSinceStart < this.RECONNECT_TIMEOUT_MS) {
        console.log(`⏭️ Skipping cell reconnect - already reconnecting: ${rundownId} (source: ${new Error().stack?.split('\n')[2]?.trim()})`);
        return;
      } else {
        console.warn(`⚠️ Cell reconnection timeout exceeded for ${rundownId}, clearing stuck state`);
        this.clearReconnectingState(rundownId);
      }
    }
    
    // ONLY set guard for non-dead channels
    if (!isChannelDead) {
      console.log(`📱 Setting reconnection guard for ${rundownId} (non-dead channel)`);
      this.reconnecting.set(rundownId, true);
      this.reconnectStartTimes.set(rundownId, Date.now());
      
      // Set timeout to clear stuck reconnecting state
      const guardTimeout = setTimeout(() => {
        if (this.reconnecting.get(rundownId)) {
          console.warn(`⏱️ Cell reconnection guard timeout for ${rundownId}, forcing clear`);
          this.clearReconnectingState(rundownId);
        }
      }, this.RECONNECT_TIMEOUT_MS);
      
      this.reconnectGuardTimeouts.set(rundownId, guardTimeout);
    }
    
    // Validate auth session before reconnecting
    const isSessionValid = await authMonitor.isSessionValid();
    if (!isSessionValid) {
      console.log('🔐 CellBroadcast: Skipping reconnect - auth session invalid');
      this.sessionExpired = true;
      this.reconnecting.delete(rundownId);
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
    // Don't reset attempts here - let SUBSCRIBED handler reset on success
    
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
  
  // Get last broadcast received time for health monitoring
  getLastBroadcastTime(rundownId: string): number {
    return this.lastBroadcastReceivedAt.get(rundownId) || 0;
  }
  
  // Check if channel is stale (connected but no recent broadcasts)
  isChannelStale(rundownId: string, maxAgeMs: number): boolean {
    const lastBroadcast = this.lastBroadcastReceivedAt.get(rundownId);
    if (!lastBroadcast) return false; // Never received a broadcast, can't determine staleness
    return Date.now() - lastBroadcast > maxAgeMs;
  }
  
  /**
   * Clear reconnecting state and timeouts for a rundown
   */
  clearReconnectingState(rundownId: string): void {
    this.reconnecting.delete(rundownId);
    this.reconnectStartTimes.delete(rundownId);
    
    const guardTimeout = this.reconnectGuardTimeouts.get(rundownId);
    if (guardTimeout) {
      clearTimeout(guardTimeout);
      this.reconnectGuardTimeouts.delete(rundownId);
    }
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
    this.lastBroadcastReceivedAt.delete(rundownId);
    
    this.cleanupChannel(rundownId);
  }
}

export const cellBroadcast = new CellBroadcastManager();