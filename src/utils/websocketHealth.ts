import { supabase } from '@/integrations/supabase/client';

/**
 * WebSocket Health Check Utility
 * 
 * Detects dead WebSocket connections and forces full Supabase reconnection.
 * Critical for recovering from long periods of inactivity (8+ hours).
 */
// Module-level guards for health check throttling
let isHealthCheckRunning = false;
let lastHealthCheckTime = 0;
const HEALTH_CHECK_COOLDOWN_MS = 2000; // 2 seconds between health checks (reduced for faster detection)
let lastActivityTime = Date.now(); // Track last successful activity

export const websocketHealthCheck = {
  /**
   * Check if Supabase's underlying WebSocket is alive
   */
  async isWebSocketAlive(): Promise<boolean> {
    // Singleton guard: prevent concurrent health checks
    if (isHealthCheckRunning) {
      console.log('🔍 WebSocket health check already running, skipping');
      return false;
    }
    
    // Cooldown guard: prevent health check storms
    const now = Date.now();
    if (now - lastHealthCheckTime < HEALTH_CHECK_COOLDOWN_MS) {
      const waitTime = Math.ceil((HEALTH_CHECK_COOLDOWN_MS - (now - lastHealthCheckTime)) / 1000);
      console.log(`🔍 WebSocket health check on cooldown, assuming healthy (checked ${waitTime}s ago)`);
      return true; // Assume healthy if recently validated
    }
    
    isHealthCheckRunning = true;
    lastHealthCheckTime = now;
    
    try {
      // Test connection with a lightweight health check channel
      const testChannel = supabase.channel(`health-check-${Date.now()}`);
      
      return new Promise<boolean>((resolve) => {
        let resolved = false;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.log('🔍 WebSocket health check: timeout (dead)');
            // Force cleanup even if subscribe never fires
            try {
              supabase.removeChannel(testChannel);
            } catch (err) {
              console.warn('🔍 Error cleaning up health check channel:', err);
            }
            resolve(false);
          }
        }, 1500); // 1.5 seconds for fast failure detection
        
        testChannel.subscribe((status) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            const isAlive = status === 'SUBSCRIBED';
            console.log('🔍 WebSocket health check:', isAlive ? 'alive ✅' : 'dead ❌', `(status: ${status})`);
            // Cleanup channel
            try {
              supabase.removeChannel(testChannel);
            } catch (err) {
              console.warn('🔍 Error cleaning up health check channel:', err);
            }
            resolve(isAlive);
          }
        });
      });
    } catch (error) {
      console.error('🔍 WebSocket health check failed:', error);
      return false;
    } finally {
      isHealthCheckRunning = false;
    }
  },

  /**
   * Force Supabase to close and reopen its WebSocket connection
   */
  async forceWebSocketReconnect(): Promise<boolean> {
    console.log('🔌 Forcing WebSocket reconnection...');
    
    try {
      // Set global reconnection flag to prevent recursive cleanup
      (globalThis as any)._isGlobalReconnecting = true;
      
      // Get all active channels
      const channels = supabase.getChannels();
      console.log(`🔌 Cleaning up ${channels.length} existing channels...`);
      
      // Remove all channels to force socket closure
      await Promise.all(channels.map(ch => supabase.removeChannel(ch)));
      
      // Minimal wait for Supabase's internal WebSocket cleanup (200ms is enough)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('🔌 WebSocket cleanup complete, testing new connection...');
      
      // Verify reconnection with health check
      let isAlive = await this.isWebSocketAlive();
      
      // Retry once if verification fails
      if (!isAlive) {
        console.log('🔌 First verification failed, retrying in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        isAlive = await this.isWebSocketAlive();
      }
      
      if (isAlive) {
        console.log('✅ WebSocket reconnection successful');
        
        // Adaptive stabilization based on inactivity duration
        const inactiveDuration = Date.now() - lastActivityTime;
        const stabilizationTime = Math.min(3000, 100 + Math.floor(inactiveDuration / 1000) * 50);
        
        if (stabilizationTime > 100) {
          console.log(`⏳ Waiting ${stabilizationTime}ms for WebSocket to stabilize (inactive for ${Math.round(inactiveDuration / 1000)}s)...`);
          await new Promise(resolve => setTimeout(resolve, stabilizationTime));
          console.log('✅ WebSocket stable. Reconnecting channels...');
        }
      } else {
        console.warn('❌ WebSocket reconnection failed after retry');
      }
      
      return isAlive;
    } catch (error) {
      console.error('❌ WebSocket reconnection error:', error);
      return false;
    } finally {
      // Clear global reconnection flag
      (globalThis as any)._isGlobalReconnecting = false;
    }
  },

  /**
   * Check if WebSocket was recently validated (within last 5 seconds)
   */
  wasRecentlyValidated(): boolean {
    const lastCheck = (this as any)._lastValidation || 0;
    return Date.now() - lastCheck < 5000;
  },

  /**
   * Mark WebSocket as validated
   */
  markValidated(): void {
    (this as any)._lastValidation = Date.now();
    lastActivityTime = Date.now();
  },

  /**
   * Check if connection is stale (no activity for extended period)
   */
  isConnectionStale(): boolean {
    const staleDuration = Date.now() - lastActivityTime;
    // Consider stale if no activity for 60+ seconds
    return staleDuration > 60000;
  },

  /**
   * Aggressive health check that bypasses cooldown (for wake-from-sleep)
   */
  async forceHealthCheck(): Promise<boolean> {
    console.log('🔍 FORCING health check (bypassing cooldown)');
    lastHealthCheckTime = 0; // Reset cooldown
    isHealthCheckRunning = false; // Reset running flag
    return await this.isWebSocketAlive();
  },

  /**
   * Reset cooldown (useful after wake from sleep)
   */
  resetCooldown(): void {
    lastHealthCheckTime = 0;
    lastActivityTime = Date.now();
  }
};
