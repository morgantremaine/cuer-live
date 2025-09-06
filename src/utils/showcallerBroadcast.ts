// Showcaller real-time broadcast system for instant sync
import { supabase } from '@/integrations/supabase/client';

export interface ShowcallerBroadcastState {
  rundownId: string;
  userId: string;
  timestamp: number;
  isPlaying?: boolean;
  currentSegmentId?: string;
  timeRemaining?: number;
  isController?: boolean;
  action?: 'play' | 'pause' | 'forward' | 'backward' | 'reset' | 'jump';
  jumpToSegmentId?: string;
}

class ShowcallerBroadcastManager {
  private channels: Map<string, any> = new Map();
  private callbacks: Map<string, Set<(state: ShowcallerBroadcastState) => void>> = new Map();
  private ownUpdateTracking: Map<string, Set<string>> = new Map();

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
      });

    this.channels.set(rundownId, channel);
    return channel;
  }

  // Broadcast showcaller state change
  broadcastState(state: ShowcallerBroadcastState): void {
    const channel = this.ensureChannel(state.rundownId);
    
    // Track own update to prevent echo
    const updateId = `${state.userId}-${state.timestamp}`;
    const ownUpdates = this.ownUpdateTracking.get(state.rundownId) || new Set();
    ownUpdates.add(updateId);
    this.ownUpdateTracking.set(state.rundownId, ownUpdates);

    // Clean up old tracking after delay
    setTimeout(() => {
      const updates = this.ownUpdateTracking.get(state.rundownId);
      if (updates) {
        updates.delete(updateId);
      }
    }, 8000);

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
    userId: string
  ): () => void {
    this.ensureChannel(rundownId);
    
    const callbacks = this.callbacks.get(rundownId) || new Set();
    
    // Wrap callback to filter own updates
    const wrappedCallback = (state: ShowcallerBroadcastState) => {
      // Skip own updates
      if (state.userId === userId) {
        console.log('📺 Skipping own showcaller broadcast');
        return;
      }

      // Check if this is a duplicate of our own update
      const updateId = `${state.userId}-${state.timestamp}`;
      const ownUpdates = this.ownUpdateTracking.get(rundownId) || new Set();
      if (ownUpdates.has(updateId)) {
        console.log('📺 Skipping echoed showcaller broadcast');
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
      supabase.removeChannel(channel);
      this.channels.delete(rundownId);
    }
    
    this.callbacks.delete(rundownId);
    this.ownUpdateTracking.delete(rundownId);
  }

  // Check if user's update should be skipped (for deduplication)
  isOwnUpdate(rundownId: string, userId: string, timestamp: number): boolean {
    const updateId = `${userId}-${timestamp}`;
    const ownUpdates = this.ownUpdateTracking.get(rundownId) || new Set();
    return ownUpdates.has(updateId);
  }
}

// Export singleton instance
export const showcallerBroadcast = new ShowcallerBroadcastManager();