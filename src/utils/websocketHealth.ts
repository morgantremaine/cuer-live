import { supabase } from '@/integrations/supabase/client';

/**
 * WebSocket Health Check Utility
 * 
 * Detects dead WebSocket connections and forces full Supabase reconnection.
 * Critical for recovering from long periods of inactivity (8+ hours).
 */
export const websocketHealthCheck = {
  /**
   * Check if Supabase's underlying WebSocket is alive
   */
  async isWebSocketAlive(): Promise<boolean> {
    try {
      // Test connection with a lightweight health check channel
      const testChannel = supabase.channel(`health-check-${Date.now()}`);
      
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.log('🔍 WebSocket health check: timeout (dead)');
          supabase.removeChannel(testChannel);
          resolve(false);
        }, 3000);
        
        testChannel.subscribe((status) => {
          clearTimeout(timeout);
          const isAlive = status === 'SUBSCRIBED';
          console.log('🔍 WebSocket health check:', isAlive ? 'alive ✅' : 'dead ❌', `(status: ${status})`);
          supabase.removeChannel(testChannel);
          resolve(isAlive);
        });
      });
    } catch (error) {
      console.error('🔍 WebSocket health check failed:', error);
      return false;
    }
  },

  /**
   * Force Supabase to close and reopen its WebSocket connection
   */
  async forceWebSocketReconnect(): Promise<boolean> {
    console.log('🔌 Forcing WebSocket reconnection...');
    
    try {
      // Get all active channels
      const channels = supabase.getChannels();
      console.log(`🔌 Cleaning up ${channels.length} existing channels...`);
      
      // Remove all channels to force socket closure
      await Promise.all(channels.map(ch => supabase.removeChannel(ch)));
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔌 WebSocket cleanup complete, testing new connection...');
      
      // Verify reconnection with health check
      const isAlive = await this.isWebSocketAlive();
      
      if (isAlive) {
        console.log('✅ WebSocket reconnection successful');
      } else {
        console.warn('❌ WebSocket reconnection failed');
      }
      
      return isAlive;
    } catch (error) {
      console.error('❌ WebSocket reconnection error:', error);
      return false;
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
  }
};
