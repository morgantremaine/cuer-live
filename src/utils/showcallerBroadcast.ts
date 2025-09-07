// Showcaller real-time broadcast system for instant sync
import { supabase } from '@/integrations/supabase/client';

export interface ShowcallerBroadcastState {
  rundownId: string;
  userId: string;
  tabId?: string; // Optional for backward compatibility
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
  private lastAppliedTimestamp: Map<string, number> = new Map();
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
      .subscribe((status) => {
        console.log('📺 Showcaller broadcast status:', status, rundownId);
        this.connectionStatus.set(rundownId, status);
        
        if (status === 'SUBSCRIBED') {
          console.log('📺 ✅ Showcaller broadcast channel connected:', rundownId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('📺 ❌ Showcaller broadcast channel error:', rundownId);
          // Attempt reconnection after error
          this.reconnectChannel(rundownId);
        } else if (status === 'CLOSED') {
          console.warn('📺 ⚠️ Showcaller broadcast channel closed:', rundownId);
          // Attempt reconnection after close
          this.reconnectChannel(rundownId);
        }
      });

    this.channels.set(rundownId, channel);
    return channel;
  }

  // Reconnect channel after error or close
  private reconnectChannel(rundownId: string): void {
    console.log('📺 🔄 Attempting to reconnect showcaller broadcast channel:', rundownId);
    
    // Clean up existing channel
    const existingChannel = this.channels.get(rundownId);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
      this.channels.delete(rundownId);
    }
    
    // Recreate channel after delay
    setTimeout(() => {
      if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
        console.log('📺 🔄 Recreating showcaller broadcast channel:', rundownId);
        this.ensureChannel(rundownId);
      }
    }, 2000);
  }

  // Broadcast showcaller state change
  broadcastState(state: ShowcallerBroadcastState): void {
    const channel = this.ensureChannel(state.rundownId);
    
    // Update last applied timestamp for deduplication
    this.lastAppliedTimestamp.set(state.rundownId, state.timestamp);

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
    tabId: string
  ): () => void {
    this.ensureChannel(rundownId);
    
    const callbacks = this.callbacks.get(rundownId) || new Set();
    
    // Wrap callback to filter own updates using tabId
    const wrappedCallback = (state: ShowcallerBroadcastState) => {
      // Skip own updates based on tabId
      if (state.tabId && state.tabId === tabId) {
        console.log('📺 Skipping own showcaller broadcast (tabId match)');
        return;
      }
      
      // Skip older updates
      const lastTimestamp = this.lastAppliedTimestamp.get(rundownId) || 0;
      if (state.timestamp <= lastTimestamp) {
        console.log('📺 Skipping old showcaller broadcast');
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
    this.lastAppliedTimestamp.delete(rundownId);
    this.connectionStatus.delete(rundownId);
  }

  // Check if timestamp is newer than last applied (for deduplication)
  isNewerUpdate(rundownId: string, timestamp: number): boolean {
    const lastTimestamp = this.lastAppliedTimestamp.get(rundownId) || 0;
    return timestamp > lastTimestamp;
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