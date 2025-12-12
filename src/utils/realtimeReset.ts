// Nuclear reset utility - kills ALL WebSocket connections and starts fresh
// Used for recovery after extended sleep (laptop closed for 30+ seconds)

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

let lastVisibleAt = Date.now();
let resetAttempts = 0;

const EXTENDED_SLEEP_THRESHOLD = 30000; // 30 seconds
const MAX_RESET_ATTEMPTS = 3;

export const realtimeReset = {
  // Track when tab was last visible
  updateVisibleTimestamp(): void {
    lastVisibleAt = Date.now();
  },

  // Check if we've been away long enough to warrant a full reset
  wasExtendedSleep(): boolean {
    const wasAway = Date.now() - lastVisibleAt > EXTENDED_SLEEP_THRESHOLD;
    if (wasAway) {
      console.log(`☢️ Extended sleep detected: ${Math.round((Date.now() - lastVisibleAt) / 1000)}s`);
    }
    return wasAway;
  },

  // Get time since last visible
  getTimeSinceLastVisible(): number {
    return Date.now() - lastVisibleAt;
  },

  // Reset attempt counter (call after successful reconnection)
  resetAttemptCount(): void {
    resetAttempts = 0;
  },

  // Nuclear reset: kill everything and reconnect
  async performNuclearReset(): Promise<boolean> {
    resetAttempts++;
    
    if (resetAttempts > MAX_RESET_ATTEMPTS) {
      console.error('☢️ Nuclear reset failed 3 times - forcing page reload');
      toast.error('Connection could not be restored', {
        description: 'Refreshing page...',
        duration: 2000,
      });
      setTimeout(() => window.location.reload(), 2000);
      return false;
    }

    console.log(`☢️ NUCLEAR RESET attempt ${resetAttempts}/${MAX_RESET_ATTEMPTS}: Disconnecting all realtime channels...`);

    try {
      // Remove all channels first
      await supabase.removeAllChannels();
      console.log('☢️ All channels removed');

      // Disconnect the underlying WebSocket
      supabase.realtime.disconnect();
      console.log('☢️ WebSocket disconnected');

      // Wait for clean disconnect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reconnect WebSocket
      supabase.realtime.connect();
      console.log('☢️ WebSocket reconnected - channels must re-subscribe');

      return true;
    } catch (error) {
      console.error('☢️ Nuclear reset error:', error);
      return false;
    }
  },

  // Check if WebSocket is currently connected
  isWebSocketConnected(): boolean {
    try {
      // @ts-ignore - accessing internal state
      return supabase.realtime.isConnected();
    } catch {
      return false;
    }
  }
};
