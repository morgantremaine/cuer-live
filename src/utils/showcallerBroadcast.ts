// Showcaller real-time broadcast system - SIMPLIFIED
// Uses simple exponential backoff reconnection
import { supabase } from '@/integrations/supabase/client';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { simpleConnectionHealth } from '@/services/SimpleConnectionHealth';
import { authMonitor } from '@/services/AuthMonitor';

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
  private channels = new Map<string, any>();
  private callbacks = new Map<string, Set<(state: ShowcallerBroadcastState) => void>>();
  private connectionStatus = new Map<string, string>();
  
  // Simple reconnection state
  private retryCount = new Map<string, number>();
  private retryTimeout = new Map<string, NodeJS.Timeout>();
  private isCleaningUp = new Map<string, boolean>();
  
  private readonly MAX_RETRIES = 10;

  constructor() {
    // Handle tab visibility - verify connection when visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      
      this.channels.forEach((_, rundownId) => {
        const status = this.connectionStatus.get(rundownId);
        if (status !== 'SUBSCRIBED') {
          console.log('👁️ Tab visible - showcaller channel unhealthy, reconnecting:', rundownId);
          this.forceReconnect(rundownId);
        }
      });
    });

    // Handle network online
    window.addEventListener('online', () => {
      console.log('🌐 Network online - clearing showcaller retry counts');
      this.retryCount.clear();
    });
  }

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
      });

    // Store channel BEFORE subscribing so callback can check identity
    this.channels.set(rundownId, channel);

    channel.subscribe((status) => {
      // Ignore callbacks from old channels
      if (this.channels.get(rundownId) !== channel) {
        console.log('📺 Ignoring callback from old channel (showcaller)');
        return;
      }

      this.connectionStatus.set(rundownId, status);
      const isConnected = status === 'SUBSCRIBED';
      simpleConnectionHealth.setShowcallerConnected(rundownId, isConnected);

      if (status === 'SUBSCRIBED') {
        console.log('✅ Showcaller channel connected:', rundownId);
        // Success - reset retry count
        this.retryCount.delete(rundownId);
        this.clearRetryTimeout(rundownId);
        
        if (simpleConnectionHealth.areAllChannelsHealthy(rundownId)) {
          simpleConnectionHealth.resetFailures(rundownId);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
        if (this.isCleaningUp.get(rundownId)) return;
        
        console.warn('📺 Showcaller channel issue:', rundownId, status);
        this.scheduleRetry(rundownId);
      }
    });

    return channel;
  }

  private scheduleRetry(rundownId: string): void {
    const count = this.retryCount.get(rundownId) || 0;
    
    if (count >= this.MAX_RETRIES) {
      console.error(`🚨 Showcaller ${rundownId}: Max retries reached`);
      return;
    }

    this.clearRetryTimeout(rundownId);

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, count), 30000);
    this.retryCount.set(rundownId, count + 1);

    console.log(`📺 Showcaller: Retry ${count + 1}/${this.MAX_RETRIES} in ${delay}ms`);

    const timeout = setTimeout(() => {
      this.retryTimeout.delete(rundownId);
      this.forceReconnect(rundownId);
    }, delay);
    
    this.retryTimeout.set(rundownId, timeout);
  }

  private clearRetryTimeout(rundownId: string): void {
    const timeout = this.retryTimeout.get(rundownId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeout.delete(rundownId);
    }
  }

  async forceReconnect(rundownId: string): Promise<void> {
    // Check auth
    const isSessionValid = await authMonitor.isSessionValid();
    if (!isSessionValid) {
      console.log('🔐 Showcaller: Skipping reconnect - session expired');
      return;
    }

    console.log('📺 🔄 Force reconnecting showcaller:', rundownId);

    // Set cleanup flag to prevent status callback from triggering retry
    this.isCleaningUp.set(rundownId, true);
    this.clearRetryTimeout(rundownId);

    // Remove existing channel
    const existingChannel = this.channels.get(rundownId);
    if (existingChannel) {
      try {
        supabase.removeChannel(existingChannel);
      } catch (e) {
        console.warn('📺 Error removing channel:', e);
      }
    }
    this.channels.delete(rundownId);

    // Clear cleanup flag
    this.isCleaningUp.set(rundownId, false);

    // Recreate if callbacks exist
    if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
      this.ensureChannel(rundownId);
    }
  }

  broadcastState(state: ShowcallerBroadcastState): void {
    const channel = this.ensureChannel(state.rundownId);
    
    const updateId = `${state.userId}-${state.timestamp}`;
    ownUpdateTracker.track(updateId, `showcaller-${state.rundownId}`);

    console.log('📺 Broadcasting showcaller state:', state.action || 'state_update');
    
    channel.send({
      type: 'broadcast',
      event: 'showcaller_state',
      payload: state
    });
  }

  subscribeToShowcallerBroadcasts(
    rundownId: string, 
    callback: (state: ShowcallerBroadcastState) => void,
    currentUserId: string
  ): () => void {
    this.ensureChannel(rundownId);
    
    const callbacks = this.callbacks.get(rundownId) || new Set();
    
    const wrappedCallback = (state: ShowcallerBroadcastState) => {
      if (state.userId === currentUserId) {
        return; // Skip own broadcasts
      }
      console.log('📺 Received showcaller broadcast:', state.action || 'state_update');
      callback(state);
    };

    callbacks.add(wrappedCallback);
    this.callbacks.set(rundownId, callbacks);

    return () => {
      const cbs = this.callbacks.get(rundownId);
      if (cbs) {
        cbs.delete(wrappedCallback);
        if (cbs.size === 0) {
          this.cleanup(rundownId);
        }
      }
    };
  }

  cleanup(rundownId: string): void {
    this.isCleaningUp.set(rundownId, true);
    this.clearRetryTimeout(rundownId);
    this.retryCount.delete(rundownId);

    const channel = this.channels.get(rundownId);
    if (channel) {
      this.channels.delete(rundownId);
      this.callbacks.delete(rundownId);
      this.connectionStatus.delete(rundownId);
      ownUpdateTracker.clear(`showcaller-${rundownId}`);

      setTimeout(() => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          console.warn('📺 Error during cleanup:', e);
        }
        this.isCleaningUp.delete(rundownId);
      }, 100);
    } else {
      this.isCleaningUp.delete(rundownId);
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
