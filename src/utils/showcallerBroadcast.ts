// Showcaller real-time broadcast system for instant sync
import { supabase } from '@/integrations/supabase/client';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { realtimeReconnectionCoordinator } from '@/services/RealtimeReconnectionCoordinator';
import { unifiedConnectionHealth } from '@/services/UnifiedConnectionHealth';
import { toast } from 'sonner';

export interface ShowcallerBroadcastState {
  rundownId: string;
  userId: string;
  timestamp: number;
  isPlaying?: boolean;
  currentSegmentId?: string;
  timeRemaining?: number;
  playbackStartTime?: number; // Add precise playback start time
  isController?: boolean;
  action?: 'play' | 'pause' | 'forward' | 'backward' | 'reset' | 'jump' | 'timing' | 'sync';
  jumpToSegmentId?: string;
}

class ShowcallerBroadcastManager {
  private channels: Map<string, any> = new Map();
  private callbacks: Map<string, Set<(state: ShowcallerBroadcastState) => void>> = new Map();
  private connectionStatus: Map<string, string> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnecting: Map<string, boolean> = new Map(); // Guard against reconnection storms
  private reconnectGuardTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectStartTimes: Map<string, number> = new Map();
  private consecutiveFailures: Map<string, number> = new Map(); // Track consecutive failures
  private lastReconnectTimes: Map<string, number> = new Map(); // Debounce reconnection attempts
  private readonly RECONNECT_TIMEOUT_MS = 10000; // 10 second timeout for faster recovery after sleep
  private readonly MIN_RECONNECT_INTERVAL_MS = 5000; // 5 second minimum between reconnection attempts
  private readonly MAX_FAILURES_BEFORE_RELOAD = 5; // Force reload after 5 consecutive failures

  constructor() {
    // Listen for network online events to clear stale reconnecting flags
    window.addEventListener('online', () => {
      console.log('🌐 Network online - clearing stale showcaller reconnection guards');
      // Clear all reconnecting flags to allow immediate reconnection
      this.reconnecting.clear();
      this.reconnectStartTimes.clear();
      this.lastReconnectTimes.clear(); // Allow immediate reconnection after network restore
      // Clear guard timeouts
      this.reconnectGuardTimeouts.forEach(timeout => clearTimeout(timeout));
      this.reconnectGuardTimeouts.clear();
    });
  }

  // Create or get broadcast channel for rundown
  private ensureChannel(rundownId: string) {
    if (this.channels.has(rundownId)) {
      return this.channels.get(rundownId);
    }

    const channel = supabase
      .channel(`showcaller-broadcast-${rundownId}`)
      .on('broadcast', { event: 'showcaller_state' }, ({ payload }) => {
        const callbacks = this.callbacks.get(rundownId);
        if (callbacks) {
          callbacks.forEach(callback => callback(payload));
        }
      })
      .subscribe(async (status) => {
        this.connectionStatus.set(rundownId, status);
        
        // Update unified health service with current status
        const isConnected = status === 'SUBSCRIBED';
        unifiedConnectionHealth.setShowcallerStatus(rundownId, isConnected);
        
        // Guard: Skip if already reconnecting to prevent feedback loop
        if (this.reconnecting.get(rundownId) && status !== 'SUBSCRIBED') {
          const startTime = this.reconnectStartTimes.get(rundownId);
          if (startTime && (Date.now() - startTime > 60000)) {
            console.error('🚨 Showcaller reconnection stuck for >60s - force clearing');
            this.clearReconnectingState(rundownId);
          } else {
            console.log('⏭️ Skipping reconnect - already reconnecting:', rundownId);
            return;
          }
        }
        
        if (status === 'CHANNEL_ERROR') {
          console.error('📺 ❌ Showcaller broadcast channel error:', rundownId, {
            navigator_online: navigator.onLine,
            document_hidden: document.hidden,
            timestamp: new Date().toISOString(),
            reconnecting: this.reconnecting.get(rundownId),
            reconnectAttempts: this.reconnectAttempts.get(rundownId)
          });
          this.reconnecting.delete(rundownId);
          this.reconnectStartTimes.delete(rundownId);
          
          // Track consecutive failures (for local exponential backoff)
          const failures = (this.consecutiveFailures.get(rundownId) || 0) + 1;
          this.consecutiveFailures.set(rundownId, failures);
          console.log(`📺 Consecutive failures: ${failures}`);
          
          // Track in unified health service (it handles global threshold and page reload)
          unifiedConnectionHealth.trackFailure(rundownId);
          
          // Trigger reconnection with exponential backoff
          const attempts = this.reconnectAttempts.get(rundownId) || 0;
          this.reconnectAttempts.set(rundownId, attempts + 1);
          const delay = Math.min(2000 * Math.pow(1.5, attempts), 10000);
          console.log(`📺 Scheduling reconnection in ${delay}ms (attempt ${attempts + 1})`);
          
          // Store timeout so we can clear it on success
          const existingTimeout = this.reconnectTimeouts.get(rundownId);
          if (existingTimeout) clearTimeout(existingTimeout);
          const timeout = setTimeout(() => {
            this.reconnectTimeouts.delete(rundownId);
            this.forceReconnect(rundownId);
          }, delay);
          this.reconnectTimeouts.set(rundownId, timeout);
        } else if (status === 'CLOSED') {
          console.warn('📺 ⚠️ Showcaller broadcast channel closed:', rundownId);
          this.reconnecting.delete(rundownId);
          this.reconnectStartTimes.delete(rundownId);
          
          // Track consecutive failures
          const failures = (this.consecutiveFailures.get(rundownId) || 0) + 1;
          this.consecutiveFailures.set(rundownId, failures);
          console.log(`📺 Consecutive failures: ${failures}/${this.MAX_FAILURES_BEFORE_RELOAD}`);
          
          // Track in unified health service
          unifiedConnectionHealth.trackFailure(rundownId);
          
          if (failures >= this.MAX_FAILURES_BEFORE_RELOAD) {
            console.error('🚨 Showcaller: Too many consecutive failures - forcing page reload');
            toast.error("Connection could not be restored", {
              description: "Refreshing page in 3 seconds to recover...",
              duration: 3000,
            });
            setTimeout(() => {
              window.location.reload();
            }, 3000);
            return;
          }
          
          // Trigger reconnection with exponential backoff
          const attempts = this.reconnectAttempts.get(rundownId) || 0;
          this.reconnectAttempts.set(rundownId, attempts + 1);
          const delay = Math.min(2000 * Math.pow(1.5, attempts), 10000);
          console.log(`📺 Scheduling reconnection in ${delay}ms (attempt ${attempts + 1})`);
          
          // Store timeout so we can clear it on success
          const existingTimeout = this.reconnectTimeouts.get(rundownId);
          if (existingTimeout) clearTimeout(existingTimeout);
          const timeout = setTimeout(() => {
            this.reconnectTimeouts.delete(rundownId);
            this.forceReconnect(rundownId);
          }, delay);
          this.reconnectTimeouts.set(rundownId, timeout);
        } else if (status === 'TIMED_OUT') {
          console.warn('📺 ⚠️ Showcaller broadcast channel timed out:', rundownId);
          this.reconnecting.delete(rundownId);
          this.reconnectStartTimes.delete(rundownId);
          
          // Track consecutive failures (for local exponential backoff)
          const failures = (this.consecutiveFailures.get(rundownId) || 0) + 1;
          this.consecutiveFailures.set(rundownId, failures);
          console.log(`📺 Consecutive failures: ${failures}`);
          
          // Track in unified health service (it handles global threshold and page reload)
          unifiedConnectionHealth.trackFailure(rundownId);
          
          // Trigger reconnection with exponential backoff
          const attempts = this.reconnectAttempts.get(rundownId) || 0;
          this.reconnectAttempts.set(rundownId, attempts + 1);
          const delay = Math.min(2000 * Math.pow(1.5, attempts), 10000);
          console.log(`📺 Scheduling reconnection in ${delay}ms (attempt ${attempts + 1})`);
          
          // Store timeout so we can clear it on success
          const existingTimeout = this.reconnectTimeouts.get(rundownId);
          if (existingTimeout) clearTimeout(existingTimeout);
          const timeout = setTimeout(() => {
            this.reconnectTimeouts.delete(rundownId);
            this.forceReconnect(rundownId);
          }, delay);
          this.reconnectTimeouts.set(rundownId, timeout);
        } else if (status === 'SUBSCRIBED') {
          // Reset reconnect attempts, failures, and clear guard flag on successful connection
          this.reconnectAttempts.delete(rundownId);
          this.consecutiveFailures.delete(rundownId);
          this.reconnecting.delete(rundownId);
          this.reconnectStartTimes.delete(rundownId);
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
            console.log('📺 All channels healthy - resetting global failure count');
            unifiedConnectionHealth.resetFailures(rundownId);
          }
        }
      });

    this.channels.set(rundownId, channel);
    return channel;
  }

  // Removed handleChannelReconnect - coordinator now handles all reconnection logic

  // Force reconnection (called by RealtimeReconnectionCoordinator)
  async forceReconnect(rundownId: string): Promise<void> {
    console.log('📺 🔄 Force reconnect requested for:', rundownId);
    
    // Debounce: prevent rapid reconnection attempts
    const now = Date.now();
    const lastReconnect = this.lastReconnectTimes.get(rundownId) || 0;
    if (now - lastReconnect < this.MIN_RECONNECT_INTERVAL_MS) {
      console.log(`⏭️ Skipping showcaller reconnect - too soon (${Math.round((now - lastReconnect)/1000)}s since last)`);
      return;
    }
    this.lastReconnectTimes.set(rundownId, now);
    
    // Check auth first before attempting reconnection
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      console.warn('📺 ⚠️ Cannot reconnect showcaller - invalid auth session');
      this.reconnecting.delete(rundownId);
      return;
    }
    
    const currentStatus = this.connectionStatus.get(rundownId);
    const isReconnecting = this.reconnecting.get(rundownId);
    const startTime = this.reconnectStartTimes.get(rundownId);
    
    // CRITICAL FIX: If channel is definitely dead (TIMED_OUT/CLOSED/CHANNEL_ERROR), 
    // bypass the guard and reconnect immediately without setting guard
    const isChannelDead = currentStatus === 'TIMED_OUT' || 
                          currentStatus === 'CLOSED' || 
                          currentStatus === 'CHANNEL_ERROR';
    
    if (isChannelDead) {
      // Channel is dead - clear any existing guard and proceed WITHOUT setting new guard
      console.log('📺 💀 Channel is dead, clearing guard and proceeding with immediate reconnect');
      this.clearReconnectingState(rundownId);
    } else if (isReconnecting && startTime) {
      // Only check guard for non-dead channels
      const timeSinceStart = Date.now() - startTime;
      if (timeSinceStart < this.RECONNECT_TIMEOUT_MS) {
        console.log(`⏭️ Skipping reconnect - already reconnecting: ${rundownId} (source: ${new Error().stack?.split('\n')[2]?.trim()})`);
        return;
      } else {
        console.warn(`⚠️ Reconnection timeout exceeded for ${rundownId}, clearing stuck state`);
        this.clearReconnectingState(rundownId);
      }
    }
    
    // ONLY set guard for non-dead channels
    if (!isChannelDead) {
      console.log(`📺 Setting reconnection guard for ${rundownId} (non-dead channel)`);
      this.reconnecting.set(rundownId, true);
      this.reconnectStartTimes.set(rundownId, Date.now());
      
      // Set timeout to clear stuck reconnecting state
      const guardTimeout = setTimeout(() => {
        if (this.reconnecting.get(rundownId)) {
          console.warn(`⏱️ Reconnection guard timeout for ${rundownId}, forcing clear`);
          this.clearReconnectingState(rundownId);
        }
      }, this.RECONNECT_TIMEOUT_MS);
      
      this.reconnectGuardTimeouts.set(rundownId, guardTimeout);
    }
    
    // Clean up and reconnect immediately (coordinator validates auth)
    const existingChannel = this.channels.get(rundownId);
    if (existingChannel) {
      try {
        supabase.removeChannel(existingChannel);
      } catch (error) {
        console.warn('📺 Error removing channel during force reconnect:', error);
      }
    }
    
    this.channels.delete(rundownId);
    
    if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
      this.ensureChannel(rundownId);
    }
  }

  // Broadcast showcaller state change
  broadcastState(state: ShowcallerBroadcastState): void {
    const channel = this.ensureChannel(state.rundownId);
    
    // Track own update using centralized tracker with consistent 30-second cleanup
    const updateId = `${state.userId}-${state.timestamp}`;
    ownUpdateTracker.track(updateId, `showcaller-${state.rundownId}`);

    console.log('📺 Broadcasting showcaller state:', state.action || 'state_update', state);
    
    channel.send({
      type: 'broadcast',
      event: 'showcaller_state',
      payload: state
    });
  }

  // Subscribe to showcaller broadcasts
  subscribeToShowcallerBroadcasts(
    rundownId: string, 
    callback: (state: ShowcallerBroadcastState) => void,
    currentUserId: string
  ): () => void {
    this.ensureChannel(rundownId);
    
    // Register with reconnection coordinator
    realtimeReconnectionCoordinator.register(
      `showcaller-${rundownId}`,
      'showcaller',
      () => this.forceReconnect(rundownId)
    );
    
    const callbacks = this.callbacks.get(rundownId) || new Set();
    
    // Wrap callback to filter own updates (simplified for single sessions)
    const wrappedCallback = (state: ShowcallerBroadcastState) => {
      // Skip own updates to prevent loops (simplified for single sessions)
      if (this.isOwnUpdate(rundownId, state.userId, currentUserId)) {
        console.log('⏭️ Skipping own showcaller broadcast');
        return;
      }

      console.log('📺 Received showcaller broadcast:', state.action || 'state_update', state);
      callback(state);
    };

    callbacks.add(wrappedCallback);
    this.callbacks.set(rundownId, callbacks);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(rundownId);
      if (callbacks) {
        callbacks.delete(wrappedCallback);
        if (callbacks.size === 0) {
          // Unregister from coordinator
          realtimeReconnectionCoordinator.unregister(`showcaller-${rundownId}`);
          this.cleanup(rundownId);
        }
      }
    };
  }

  // Cleanup channel and callbacks
  cleanup(rundownId: string): void {
    // Clear reconnect timeouts
    const timeout = this.reconnectTimeouts.get(rundownId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(rundownId);
    }
    this.reconnectAttempts.delete(rundownId);

    const channel = this.channels.get(rundownId);
    if (channel) {
      console.log('📺 Cleaning up showcaller broadcast channel:', rundownId);
      
      // Prevent recursive cleanup
      this.channels.delete(rundownId);
      this.callbacks.delete(rundownId);
      this.connectionStatus.delete(rundownId);
      
      // Clean up tracked updates in centralized tracker
      ownUpdateTracker.clear(`showcaller-${rundownId}`);
      
      // Safe async cleanup
      setTimeout(() => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('📺 Error during channel cleanup:', error);
        }
      }, 0);
    }
  }

  // Simple own-update detection using userId (single session per user)
  private isOwnUpdate(rundownId: string, userId: string, currentUserId: string): boolean {
    return userId === currentUserId;
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

  // Get connection status for a rundown
  getConnectionStatus(rundownId: string): string | null {
    return this.connectionStatus.get(rundownId) || null;
  }

  // Check if channel is connected
  isChannelConnected(rundownId: string): boolean {
    return this.connectionStatus.get(rundownId) === 'SUBSCRIBED';
  }
}

// Export singleton instance
export const showcallerBroadcast = new ShowcallerBroadcastManager();
