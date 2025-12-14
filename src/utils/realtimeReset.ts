// Nuclear reset utility - kills ALL WebSocket connections and starts fresh
// Used for recovery after extended sleep (laptop closed for 30+ seconds)

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

let lastVisibleAt = Date.now();
let resetAttempts = 0;
let isResetting = false; // Lock to prevent concurrent resets

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

  // Check if reset is in progress
  isResetInProgress(): boolean {
    return isResetting;
  },

  // Wait for WebSocket to actually connect and stabilize
  async waitForWebSocketConnection(timeoutMs: number = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        // @ts-ignore - accessing internal state
        const isConnected = supabase.realtime.isConnected?.();
        // @ts-ignore - check actual WebSocket readyState
        const ws = supabase.realtime.conn;
        const wsReady = ws?.readyState === 1; // WebSocket.OPEN = 1
        
        if (isConnected && wsReady) {
          return true;
        }
      } catch {
        // Ignore errors checking connection state
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.warn('☢️ WebSocket connection timeout after', timeoutMs, 'ms');
    return false;
  },

  // Nuclear reset: kill everything and reconnect
  async performNuclearReset(): Promise<boolean> {
    // Prevent concurrent resets
    if (isResetting) {
      console.log('☢️ Reset already in progress, skipping');
      return false;
    }

    isResetting = true;
    resetAttempts++;
    
    if (resetAttempts > MAX_RESET_ATTEMPTS) {
      console.error('☢️ Nuclear reset failed 3 times - forcing page reload');
      toast.error('Connection could not be restored', {
        description: 'Refreshing page...',
        duration: 2000,
      });
      setTimeout(() => window.location.reload(), 2000);
      isResetting = false;
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

      // Wait for clean disconnect - increased to 2 seconds to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Reconnect WebSocket
      supabase.realtime.connect();
      console.log('☢️ WebSocket reconnecting...');

      // Wait for actual connection before returning
      const connected = await this.waitForWebSocketConnection(5000);
      if (connected) {
        // Add stabilization delay - prevents CHANNEL_ERROR oscillation
        // The WebSocket may report connected before it's fully stable for channel subscriptions
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('☢️ WebSocket stabilized - channels can now re-subscribe');
      } else {
        console.warn('☢️ WebSocket connection not confirmed, proceeding anyway');
      }

      return true;
    } catch (error) {
      console.error('☢️ Nuclear reset error:', error);
      return false;
    } finally {
      isResetting = false;
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
