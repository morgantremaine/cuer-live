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
      .subscribe(async (status) => {
        console.log('📺 Showcaller broadcast status:', status, rundownId);
        this.connectionStatus.set(rundownId, status);
        
        if (status === 'SUBSCRIBED') {
          console.log('📺 ✅ Showcaller broadcast channel connected:', rundownId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('📺 ❌ Showcaller broadcast channel error:', rundownId, status);
          // Notify coordinator of channel error
          realtimeReconnectionCoordinator.handleChannelError(`showcaller-${rundownId}`);
        } else if (status === 'CLOSED') {
          console.warn('📺 ⚠️ Showcaller broadcast channel closed:', rundownId);
        }
      });

    this.channels.set(rundownId, channel);
    return channel;
  }

  // Force reconnection (called by RealtimeReconnectionCoordinator)
  async forceReconnect(rundownId: string): Promise<void> {
    console.log('📺 🔄 Force reconnect requested for:', rundownId);
    
    // Clean up existing channel
    const existingChannel = this.channels.get(rundownId);
    if (existingChannel) {
      try {
        supabase.removeChannel(existingChannel);
      } catch (error) {
        console.warn('📺 Error removing channel during force reconnect:', error);
      }
    }
    
    this.channels.delete(rundownId);
    
    // Wait for cleanup before recreating (prevents zombie state)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Recreate channel if still needed
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