// Showcaller real-time broadcast system for instant sync
import { supabase } from '@/integrations/supabase/client';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { realtimeReconnectionCoordinator } from '@/services/RealtimeReconnectionCoordinator';

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
  private isReconnecting: Map<string, boolean> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private lastReconnectTime: Map<string, number> = new Map();

  // Create or get broadcast channel for rundown
  private ensureChannel(rundownId: string) {
    if (this.channels.has(rundownId)) {
      return this.channels.get(rundownId);
    }

    console.log('📺 Creating showcaller broadcast channel:', rundownId);
    
    const channel = supabase
      .channel(`showcaller-broadcast-${rundownId}`)
      .on('broadcast', { event: 'showcaller_state' }, ({ payload }) => {
        const callbacks = this.callbacks.get(rundownId);
        if (callbacks) {
          callbacks.forEach(callback => callback(payload));
        }
      })
      .subscribe((status) => {
        console.log('📺 Showcaller broadcast status:', status, rundownId);
        this.connectionStatus.set(rundownId, status);
        
        if (status === 'SUBSCRIBED') {
          console.log('📺 ✅ Showcaller broadcast channel connected:', rundownId);
          // Reset reconnection attempts on successful connection
          this.reconnectAttempts.delete(rundownId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('📺 ❌ Showcaller broadcast channel error:', rundownId);
          // Attempt reconnection after error with delay
          this.scheduleReconnection(rundownId);
        } else if (status === 'CLOSED') {
          console.warn('📺 ⚠️ Showcaller broadcast channel closed:', rundownId);
          // Attempt reconnection after close with delay
          this.scheduleReconnection(rundownId);
        }
      });

    this.channels.set(rundownId, channel);
    return channel;
  }

  // Schedule reconnection with exponential backoff and debouncing
  private scheduleReconnection(rundownId: string): void {
    const now = Date.now();
    const lastReconnect = this.lastReconnectTime.get(rundownId) || 0;
    
    // Debounce rapid reconnection attempts (within 1 second)
    if (now - lastReconnect < 1000) {
      console.log('📺 🔄 Debouncing reconnection attempt for:', rundownId);
      return;
    }

    // Prevent recursive reconnections
    if (this.isReconnecting.get(rundownId)) {
      console.log('📺 🔄 Reconnection already in progress for:', rundownId);
      return;
    }

    this.lastReconnectTime.set(rundownId, now);
    this.reconnectChannel(rundownId);
  }

  // Reconnect channel after error or close
  private async reconnectChannel(rundownId: string): Promise<void> {
    this.isReconnecting.set(rundownId, true);
    
    // Check auth status before reconnecting
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      console.warn('📺 ⚠️ Auth session invalid, waiting for token refresh before reconnecting:', rundownId);
      this.isReconnecting.set(rundownId, false);
      return; // Coordinator will trigger reconnection after token refresh
    }
    
    // Calculate exponential backoff delay
    const attempts = this.reconnectAttempts.get(rundownId) || 0;
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
    
    console.log(`📺 🔄 Scheduling reconnection attempt ${attempts + 1} for ${rundownId} in ${delay}ms`);
    
    // Clear any existing timeout
    const existingTimeout = this.reconnectTimeouts.get(rundownId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Clean up existing channel immediately
    const existingChannel = this.channels.get(rundownId);
    if (existingChannel) {
      try {
        supabase.removeChannel(existingChannel);
      } catch (error) {
        console.warn('📺 Error removing channel during reconnect:', error);
      }
      this.channels.delete(rundownId);
    }
    
    // Schedule reconnection with exponential backoff
    const timeout = setTimeout(() => {
      this.reconnectTimeouts.delete(rundownId);
      this.isReconnecting.set(rundownId, false);
      
      // Only reconnect if still needed
      if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
        // Increment attempts before trying
        this.reconnectAttempts.set(rundownId, attempts + 1);
        console.log('📺 🔄 Executing reconnection for:', rundownId);
        this.ensureChannel(rundownId);
      } else {
        console.log('📺 🔄 Skipping reconnection - no active callbacks for:', rundownId);
      }
    }, delay);

    this.reconnectTimeouts.set(rundownId, timeout);
  }
  
  // Force reconnection (called by RealtimeReconnectionCoordinator)
  async forceReconnect(rundownId: string): Promise<void> {
    console.log('📺 🔄 Force reconnect requested for:', rundownId);
    
    // Check auth first
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      console.warn('📺 ⚠️ Cannot reconnect - invalid auth session');
      return;
    }
    
    // Clean up and reconnect immediately
    const existingChannel = this.channels.get(rundownId);
    if (existingChannel) {
      try {
        supabase.removeChannel(existingChannel);
      } catch (error) {
        console.warn('📺 Error removing channel during force reconnect:', error);
      }
    }
    
    this.channels.delete(rundownId);
    this.reconnectAttempts.set(rundownId, 0); // Reset attempts
    
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

    console.log('📺 Subscribed to showcaller broadcasts:', rundownId);

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
    const channel = this.channels.get(rundownId);
    if (channel) {
      console.log('📺 Cleaning up showcaller broadcast channel:', rundownId);
      
      // Clear all reconnection state
      this.isReconnecting.delete(rundownId);
      this.reconnectAttempts.delete(rundownId);
      this.lastReconnectTime.delete(rundownId);
      const timeout = this.reconnectTimeouts.get(rundownId);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(rundownId);
      }
      
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