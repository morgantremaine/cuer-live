// Showcaller real-time broadcast system for instant sync
import { supabase } from '@/integrations/supabase/client';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { unifiedConnectionHealth } from '@/services/UnifiedConnectionHealth';

export interface ShowcallerBroadcastState {
  rundownId: string;
  userId: string;
  timestamp: number;
  isPlaying?: boolean;
  currentSegmentId?: string;
  timeRemaining?: number;
  playbackStartTime?: number;
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
  private lastReconnectTimes: Map<string, number> = new Map();
  private readonly MIN_RECONNECT_INTERVAL_MS = 5000;

  constructor() {
    // Listen for network online events to allow immediate reconnection
    window.addEventListener('online', () => {
      console.log('🌐 Network online - clearing showcaller reconnection debounce');
      this.lastReconnectTimes.clear();
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
        
        // Update unified health service
        const isConnected = status === 'SUBSCRIBED';
        unifiedConnectionHealth.setShowcallerStatus(rundownId, isConnected);
        
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          console.warn('📺 Showcaller channel issue:', rundownId, status);
          
          // Track failure in unified health (handles global threshold)
          unifiedConnectionHealth.trackFailure(rundownId);
          
          // Self-reconnect with exponential backoff
          const attempts = this.reconnectAttempts.get(rundownId) || 0;
          this.reconnectAttempts.set(rundownId, attempts + 1);
          const delay = Math.min(2000 * Math.pow(1.5, attempts), 30000); // Max 30s
          
          console.log(`📺 Scheduling reconnection in ${delay}ms (attempt ${attempts + 1})`);
          
          const existingTimeout = this.reconnectTimeouts.get(rundownId);
          if (existingTimeout) clearTimeout(existingTimeout);
          
          const timeout = setTimeout(() => {
            this.reconnectTimeouts.delete(rundownId);
            this.forceReconnect(rundownId);
          }, delay);
          this.reconnectTimeouts.set(rundownId, timeout);
          
        } else if (status === 'SUBSCRIBED') {
          // Reset on success
          this.reconnectAttempts.delete(rundownId);
          
          // Clear pending timeouts
          const pendingTimeout = this.reconnectTimeouts.get(rundownId);
          if (pendingTimeout) {
            clearTimeout(pendingTimeout);
            this.reconnectTimeouts.delete(rundownId);
          }
          
          // Reset global failures if all channels healthy
          if (unifiedConnectionHealth.areAllChannelsHealthy(rundownId)) {
            unifiedConnectionHealth.resetFailures(rundownId);
          }
        }
      });

    this.channels.set(rundownId, channel);
    return channel;
  }

  // Force reconnection with debounce
  async forceReconnect(rundownId: string): Promise<void> {
    console.log('📺 🔄 Force reconnect requested for:', rundownId);
    
    // Debounce rapid attempts
    const now = Date.now();
    const lastReconnect = this.lastReconnectTimes.get(rundownId) || 0;
    if (now - lastReconnect < this.MIN_RECONNECT_INTERVAL_MS) {
      console.log(`⏭️ Skipping showcaller reconnect - too soon`);
      return;
    }
    this.lastReconnectTimes.set(rundownId, now);
    
    // Clean up existing channel
    const existingChannel = this.channels.get(rundownId);
    if (existingChannel) {
      try {
        supabase.removeChannel(existingChannel);
      } catch (error) {
        console.warn('📺 Error removing channel:', error);
      }
    }
    
    this.channels.delete(rundownId);
    
    // Recreate if callbacks exist
    if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
      this.ensureChannel(rundownId);
    }
  }

  // Broadcast showcaller state change
  broadcastState(state: ShowcallerBroadcastState): void {
    const channel = this.ensureChannel(state.rundownId);
    
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
    
    const callbacks = this.callbacks.get(rundownId) || new Set();
    
    const wrappedCallback = (state: ShowcallerBroadcastState) => {
      if (state.userId === currentUserId) {
        console.log('⏭️ Skipping own showcaller broadcast');
        return;
      }
      console.log('📺 Received showcaller broadcast:', state.action || 'state_update', state);
      callback(state);
    };

    callbacks.add(wrappedCallback);
    this.callbacks.set(rundownId, callbacks);

    return () => {
      const callbacks = this.callbacks.get(rundownId);
      if (callbacks) {
        callbacks.delete(wrappedCallback);
        if (callbacks.size === 0) {
          this.cleanup(rundownId);
        }
      }
    };
  }

  // Cleanup channel and callbacks
  cleanup(rundownId: string): void {
    const timeout = this.reconnectTimeouts.get(rundownId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(rundownId);
    }
    this.reconnectAttempts.delete(rundownId);

    const channel = this.channels.get(rundownId);
    if (channel) {
      console.log('📺 Cleaning up showcaller broadcast channel:', rundownId);
      
      this.channels.delete(rundownId);
      this.callbacks.delete(rundownId);
      this.connectionStatus.delete(rundownId);
      
      ownUpdateTracker.clear(`showcaller-${rundownId}`);
      
      setTimeout(() => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('📺 Error during channel cleanup:', error);
        }
      }, 0);
    }
  }

  getConnectionStatus(rundownId: string): string | null {
    return this.connectionStatus.get(rundownId) || null;
  }

  isChannelConnected(rundownId: string): boolean {
    return this.connectionStatus.get(rundownId) === 'SUBSCRIBED';
  }
}

export const showcallerBroadcast = new ShowcallerBroadcastManager();
