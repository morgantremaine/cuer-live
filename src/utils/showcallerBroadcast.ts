// Showcaller real-time broadcast system - NUCLEAR RESET VERSION
// Simple channel management, no complex retry logic
// Recovery handled by realtimeReset.ts nuclear reset

import { supabase } from '@/integrations/supabase/client';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { simpleConnectionHealth } from '@/services/SimpleConnectionHealth';

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

    this.channels.set(rundownId, channel);

    channel.subscribe((status) => {
      // Ignore callbacks from old channels
      if (this.channels.get(rundownId) !== channel) {
        return;
      }

      this.connectionStatus.set(rundownId, status);
      const isConnected = status === 'SUBSCRIBED';
      simpleConnectionHealth.setShowcallerConnected(rundownId, isConnected);

      if (status === 'SUBSCRIBED') {
        console.log('✅ Showcaller channel connected:', rundownId);
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
        console.warn('📺 Showcaller channel issue:', rundownId, status);
        // No retry - nuclear reset will handle recovery
      }
    });

    return channel;
  }

  // Called after nuclear reset to re-establish channel
  reinitialize(rundownId: string): void {
    if (this.callbacks.has(rundownId) && this.callbacks.get(rundownId)!.size > 0) {
      console.log('📺 Reinitializing showcaller channel after nuclear reset');
      this.channels.delete(rundownId);
      this.connectionStatus.delete(rundownId);
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
      }, 100);
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
