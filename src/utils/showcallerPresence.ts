// Enhanced showcaller presence tracking with activity indicators
import { supabase } from '@/integrations/supabase/client';

export interface ShowcallerPresenceState {
  userId: string;
  rundownId: string;
  isActive: boolean;
  isController: boolean;
  lastActivity: number;
  connectionType: 'broadcast' | 'fallback' | 'offline';
}

class ShowcallerPresenceManager {
  private presenceChannels: Map<string, any> = new Map();
  private presenceCallbacks: Map<string, Set<(users: ShowcallerPresenceState[]) => void>> = new Map();
  private ownPresence: Map<string, ShowcallerPresenceState> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Update own presence state
  updatePresence(rundownId: string, userId: string, state: Partial<ShowcallerPresenceState>): void {
    const channel = this.ensurePresenceChannel(rundownId);
    
    const presenceState: ShowcallerPresenceState = {
      userId,
      rundownId,
      isActive: true,
      isController: false,
      lastActivity: Date.now(),
      connectionType: 'broadcast',
      ...state
    };

    this.ownPresence.set(rundownId, presenceState);

    // Track presence via Supabase realtime
    channel.track(presenceState);

    console.log('📺 Updated showcaller presence:', presenceState);
  }

  // Subscribe to presence updates
  subscribeToPresence(
    rundownId: string,
    callback: (users: ShowcallerPresenceState[]) => void
  ): () => void {
    this.ensurePresenceChannel(rundownId);
    
    const callbacks = this.presenceCallbacks.get(rundownId) || new Set();
    callbacks.add(callback);
    this.presenceCallbacks.set(rundownId, callbacks);

    console.log('📺 Subscribed to showcaller presence:', rundownId);

    return () => {
      const callbacks = this.presenceCallbacks.get(rundownId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.cleanup(rundownId);
        }
      }
    };
  }

  // Signal controller activity
  signalActivity(rundownId: string, userId: string, action?: string): void {
    const current = this.ownPresence.get(rundownId);
    if (current) {
      this.updatePresence(rundownId, userId, {
        ...current,
        lastActivity: Date.now(),
        isActive: true
      });

      console.log('📺 Signaled showcaller activity:', action || 'activity', rundownId);
    }
  }

  private ensurePresenceChannel(rundownId: string) {
    if (this.presenceChannels.has(rundownId)) {
      return this.presenceChannels.get(rundownId);
    }

    console.log('📺 Creating showcaller presence channel:', rundownId);
    
    const channel = supabase
      .channel(`showcaller-presence-${rundownId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = this.formatPresenceState(state);
        this.notifyCallbacks(rundownId, users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('📺 User joined showcaller:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('📺 User left showcaller:', leftPresences);
      })
      .subscribe((status) => {
        console.log('📺 Showcaller presence status:', status, rundownId);
        
        // Set up heartbeat to maintain presence
        if (status === 'SUBSCRIBED') {
          this.setupHeartbeat(rundownId);
        }
      });

    this.presenceChannels.set(rundownId, channel);
    return channel;
  }

  private formatPresenceState(state: any): ShowcallerPresenceState[] {
    const users: ShowcallerPresenceState[] = [];
    
    Object.values(state).forEach((presences: any) => {
      presences.forEach((presence: ShowcallerPresenceState) => {
        users.push(presence);
      });
    });

    return users.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  private notifyCallbacks(rundownId: string, users: ShowcallerPresenceState[]): void {
    const callbacks = this.presenceCallbacks.get(rundownId);
    if (callbacks) {
      callbacks.forEach(callback => callback(users));
    }
  }

  private setupHeartbeat(rundownId: string): void {
    // Clear existing heartbeat
    const existing = this.heartbeatIntervals.get(rundownId);
    if (existing) {
      clearInterval(existing);
    }

    // Set up new heartbeat every 30 seconds
    const interval = setInterval(() => {
      const presence = this.ownPresence.get(rundownId);
      if (presence) {
        const channel = this.presenceChannels.get(rundownId);
        if (channel) {
          // Update last activity timestamp
          channel.track({
            ...presence,
            lastActivity: Date.now()
          });
        }
      }
    }, 30000);

    this.heartbeatIntervals.set(rundownId, interval);
  }

  // Cleanup presence tracking
  cleanup(rundownId: string): void {
    const channel = this.presenceChannels.get(rundownId);
    if (channel) {
      console.log('📺 Cleaning up showcaller presence:', rundownId);
      supabase.removeChannel(channel);
      this.presenceChannels.delete(rundownId);
    }

    const interval = this.heartbeatIntervals.get(rundownId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(rundownId);
    }
    
    this.presenceCallbacks.delete(rundownId);
    this.ownPresence.delete(rundownId);
  }
}

// Export singleton instance
export const showcallerPresence = new ShowcallerPresenceManager();