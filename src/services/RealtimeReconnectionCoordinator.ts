import { supabase } from '@/integrations/supabase/client';

type ReconnectionHandler = () => Promise<void>;

interface RegisteredConnection {
  id: string;
  type: 'showcaller' | 'cell' | 'consolidated';
  reconnect: ReconnectionHandler;
  lastReconnect: number;
  failedAttempts: number;
  circuitState: 'closed' | 'open' | 'half-open';
  lastFailureTime: number;
}

/**
 * Realtime Reconnection Coordinator
 * 
 * Coordinates reconnections through periodic health monitoring and network events.
 * Prevents cascading reconnection storms by staggering reconnection attempts.
 */
class RealtimeReconnectionCoordinatorService {
  private connections: Map<string, RegisteredConnection> = new Map();
  private isReconnecting: boolean = false;
  private reconnectionDebounceTimer: NodeJS.Timeout | null = null;
  private consecutiveWebSocketFailures: number = 0;
  private lastWebSocketCheckTime: number = 0;
  private websocketFailureResetTimer: NodeJS.Timeout | null = null;
  private stuckOfflineTimer: NodeJS.Timeout | null = null;
  private lastVisibilityChange: number = 0;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;
  private channelErrorCooldowns: Map<string, number> = new Map(); // Prevent rapid-fire errors
  private readonly RECONNECTION_DEBOUNCE_MS = 5000; // 5 seconds (allow auth propagation)
  private readonly WEBSOCKET_CHECK_COOLDOWN_MS = 5000; // Only check every 5 seconds
  private readonly MAX_WEBSOCKET_FAILURES = 3; // Stop retries after 3 failures
  private readonly WEBSOCKET_FAILURE_RESET_MS = 300000; // Reset after 5 minutes
  private readonly MIN_RECONNECTION_INTERVAL_MS = 10000; // 10 seconds minimum between reconnections
  private readonly STAGGER_DELAY_MS = 500; // 500ms delay between channels
  private readonly WEBSOCKET_STABILIZATION_MS = 2500; // 2.5s for WebSocket to stabilize
  private readonly MAX_FAILED_ATTEMPTS = 3; // Circuit breaker threshold
  private readonly CIRCUIT_OPEN_DURATION_MS = 60000; // 1 minute
  private readonly BASE_BACKOFF_DELAY_MS = 2000; // 2 seconds
  private readonly MAX_BACKOFF_DELAY_MS = 30000; // 30 seconds
  private readonly MAX_REGISTRATION_WAIT_MS = 5000; // Wait up to 5s for connections to register
  private readonly REGISTRATION_CHECK_INTERVAL_MS = 500; // Check every 500ms
  private readonly VISIBILITY_DEBOUNCE_MS = 2000; // Debounce visibility changes
  private readonly STUCK_OFFLINE_TIMEOUT_MS = 30000; // 30 seconds
  private readonly CONNECTION_MONITOR_INTERVAL_MS = 60000; // Check every 60 seconds
  private readonly CHANNEL_ERROR_COOLDOWN_MS = 5000; // 5 seconds between error handling

  constructor() {
    // Listen ONLY to network online event (for wake from sleep)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkOnline.bind(this));
    }
    
    // Removed: visibilitychange listener (time-based guessing is unreliable)
    // Removed: periodic connection monitoring (not needed with channel status callbacks)
  }

  /**
   * Central error handler - called when any channel reports an error
   * This is the main entry point for reconnection logic
   */
  async handleChannelError(channelId: string): Promise<void> {
    console.log(`❌ Channel error reported: ${channelId}`);
    
    // Cooldown guard: prevent same channel from triggering multiple reconnections
    const lastError = this.channelErrorCooldowns.get(channelId) || 0;
    const now = Date.now();
    if (now - lastError < this.CHANNEL_ERROR_COOLDOWN_MS) {
      console.log(`⏭️ Channel ${channelId} on error cooldown (${Math.ceil((this.CHANNEL_ERROR_COOLDOWN_MS - (now - lastError)) / 1000)}s remaining), skipping`);
      return;
    }
    this.channelErrorCooldowns.set(channelId, now);
    
    // Only check health if not already reconnecting
    if (this.isReconnecting) {
      console.log('⏭️ Already reconnecting - skipping duplicate error handling');
      return;
    }
    
    // Set lock IMMEDIATELY to prevent race conditions
    this.isReconnecting = true;
    
    try {
      // When channels are failing, force full WebSocket reconnection
      // Don't trust health check - it can be misleading when channels are actively failing
      console.error('💀 Channel failures detected - forcing aggressive WebSocket reconnection');
      
      // Import health check utility
      const { websocketHealthCheck } = await import('@/utils/websocketHealth');
      
      // Force WebSocket reconnection without health check
      const reconnected = await websocketHealthCheck.forceWebSocketReconnect();
      
      if (reconnected) {
        // Wait for WebSocket to stabilize before reconnecting channels
        console.log(`⏳ Waiting ${this.WEBSOCKET_STABILIZATION_MS / 1000} seconds for WebSocket to stabilize before channel reconnection...`);
        await new Promise(resolve => setTimeout(resolve, this.WEBSOCKET_STABILIZATION_MS));
        
        // Now reconnect channels
        await this.executeReconnection();
      } else {
        console.error('❌ WebSocket reconnection failed - will retry via circuit breaker');
      }
    } finally {
      // Always clear the lock
      this.isReconnecting = false;
    }
  }



  /**
   * Handle network online event
   */
  private async handleNetworkOnline() {
    const wakeTime = new Date().toISOString();
    console.log('🌐 ⏰ Network online event fired at', wakeTime);
    console.log('💤 Checking if this was a wake-from-sleep event...');
    
    // Give browser 1s to fully establish network
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Import health check utility
    const { websocketHealthCheck } = await import('@/utils/websocketHealth');
    
    // Check if WebSocket is already alive
    const isAlive = await websocketHealthCheck.isWebSocketAlive();
    
    if (isAlive) {
      console.log('✅ WebSocket healthy - likely just network blip, not sleep');
      return;
    }
    
    console.log('💤 ➡️ 🌅 CONFIRMED: Wake from sleep detected - WebSocket dead');
    console.log('🔄 Initiating graceful reconnection sequence...');
    // Only reconnect if WebSocket is actually dead
    await this.executeReconnection();
  }


  /**
   * Register a realtime connection
   */
  register(id: string, type: RegisteredConnection['type'], reconnect: ReconnectionHandler) {
    console.log(`🔄 ReconnectionCoordinator: Registered ${type} connection: ${id}`);
    this.connections.set(id, {
      id,
      type,
      reconnect,
      lastReconnect: 0,
      failedAttempts: 0,
      circuitState: 'closed',
      lastFailureTime: 0
    });
  }

  /**
   * Unregister a connection
   */
  unregister(id: string) {
    console.log(`🔄 ReconnectionCoordinator: Unregistered connection: ${id}`);
    this.connections.delete(id);
  }

  /**
   * Get reconnection status
   */
  getStatus() {
    return {
      isReconnecting: this.isReconnecting,
      connectionCount: this.connections.size,
      connections: Array.from(this.connections.values()).map(c => ({
        id: c.id,
        type: c.type,
        lastReconnect: c.lastReconnect,
        failedAttempts: c.failedAttempts,
        circuitState: c.circuitState,
        retryIn: c.circuitState === 'open' 
          ? Math.max(0, this.CIRCUIT_OPEN_DURATION_MS - (Date.now() - c.lastFailureTime))
          : 0
      }))
    };
  }

  /**
   * Check if currently reconnecting
   */
  isCurrentlyReconnecting(): boolean {
    return this.isReconnecting;
  }


  /**
   * Execute reconnection for all registered connections
   */
  private async executeReconnection() {
    if (this.isReconnecting) {
      console.log('🔄 ReconnectionCoordinator: Already reconnecting, skipping');
      return;
    }

    // PHASE 0: Ensure we have a fresh auth token BEFORE any reconnection attempts
    console.log('🔐 ReconnectionCoordinator: Validating auth session before reconnection...');
    const { authMonitor } = await import('@/services/AuthMonitor');
    
    // Check if we just got a fresh token (within last 5 seconds)
    if (authMonitor.wasRecentlyRefreshed()) {
      console.log('✅ Auth token recently refreshed, proceeding with reconnection');
    } else {
      // Validate current session
      const isValid = await authMonitor.isSessionValid();
      
      if (!isValid) {
        console.warn('⏳ Auth session invalid, waiting for refresh...');
        
        // Wait up to 10 seconds for auth refresh to complete
        const maxWaitTime = 10000;
        const startTime = Date.now();
        let refreshComplete = false;
        
        while (!refreshComplete && Date.now() - startTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if refresh happened
          if (authMonitor.wasRecentlyRefreshed()) {
            console.log('✅ Auth token refreshed during wait');
            refreshComplete = true;
            break;
          }
          
          // Recheck validity
          const nowValid = await authMonitor.isSessionValid();
          if (nowValid) {
            console.log('✅ Auth session now valid');
            refreshComplete = true;
            break;
          }
        }
        
        if (!refreshComplete) {
          console.error('❌ Auth session still invalid after waiting - aborting reconnection');
          return;
        }
      } else {
        console.log('✅ Auth session valid, proceeding with reconnection');
      }
    }

    // PHASE 0.5: Cooldown check to prevent rapid WebSocket reconnection attempts
    const timeSinceLastCheck = Date.now() - this.lastWebSocketCheckTime;
    if (timeSinceLastCheck < this.WEBSOCKET_CHECK_COOLDOWN_MS) {
      console.log(`🔄 ReconnectionCoordinator: WebSocket check on cooldown, skipping (${Math.round(timeSinceLastCheck / 1000)}s ago)`);
      return;
    }
    this.lastWebSocketCheckTime = Date.now();

    // PHASE 1: Check WebSocket health before attempting channel reconnections
    const { websocketHealthCheck } = await import('@/utils/websocketHealth');
    const isWebSocketAlive = await websocketHealthCheck.isWebSocketAlive();
    
    if (!isWebSocketAlive) {
      console.warn('🔌 WebSocket is dead - forcing full reconnection before channel setup');
      
      // Set stuck offline timer
      if (this.stuckOfflineTimer) {
        clearTimeout(this.stuckOfflineTimer);
      }
      
      this.stuckOfflineTimer = setTimeout(async () => {
        console.warn('⚠️ Stuck offline for 30s - forcing recovery');
        const { toast } = await import('sonner');
        toast.warning('Connection issues detected', {
          description: 'Attempting automatic recovery...',
          duration: 5000
        });
        this.forceReconnection();
      }, this.STUCK_OFFLINE_TIMEOUT_MS);
      
      const reconnected = await websocketHealthCheck.forceWebSocketReconnect();
      
      if (!reconnected) {
        this.consecutiveWebSocketFailures++;
        console.error(`❌ Failed to reconnect WebSocket (attempt ${this.consecutiveWebSocketFailures})`);
        
        // Clear existing reset timer
        if (this.websocketFailureResetTimer) {
          clearTimeout(this.websocketFailureResetTimer);
        }
        
        // Schedule failure counter reset after 5 minutes
        this.websocketFailureResetTimer = setTimeout(() => {
          console.log('🔄 Resetting WebSocket failure counter after cooldown');
          this.consecutiveWebSocketFailures = 0;
        }, this.WEBSOCKET_FAILURE_RESET_MS);
        
        // Show user-facing error after 3 failures and STOP retrying
        if (this.consecutiveWebSocketFailures >= this.MAX_WEBSOCKET_FAILURES) {
          const { toast } = await import('sonner');
          toast.error('Connection issues detected. Please refresh the page.', {
            duration: 10000,
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload()
            }
          });
          
          // STOP retrying after max failures - require user action
          console.error('🔄 Max WebSocket failures reached - stopping automatic retries');
          return;
        }
        
        // Schedule retry with exponential backoff
        const retryDelay = Math.min(10000 * Math.pow(2, this.consecutiveWebSocketFailures - 1), 60000);
        console.log(`🔄 Scheduling WebSocket reconnection retry in ${retryDelay / 1000} seconds...`);
        setTimeout(() => {
          this.executeReconnection();
        }, retryDelay);
        
        return;
      }
      
      // Clear stuck offline timer on success
      if (this.stuckOfflineTimer) {
        clearTimeout(this.stuckOfflineTimer);
        this.stuckOfflineTimer = null;
      }
      
      // Reset failure counter on success
      this.consecutiveWebSocketFailures = 0;
      
      // Mark WebSocket as validated
      websocketHealthCheck.markValidated();
      
      // Reset all circuit breakers after successful WebSocket reconnection
      console.log('🔄 Resetting all circuit breakers after WebSocket reconnection');
      for (const connection of this.connections.values()) {
        connection.failedAttempts = 0;
        connection.circuitState = 'closed';
        connection.lastFailureTime = 0;
      }
      
      // Broadcast reconnection complete event for showcaller recovery
      console.log('📺 Broadcasting reconnection_complete event');
      (globalThis as any)._websocketReconnectionComplete = Date.now();
      window.dispatchEvent(new CustomEvent('websocket-reconnection-complete'));
      
      // Wait for WebSocket to fully stabilize before reconnecting channels
      console.log(`⏳ Waiting ${this.WEBSOCKET_STABILIZATION_MS}ms for WebSocket to stabilize...`);
      await new Promise(resolve => setTimeout(resolve, this.WEBSOCKET_STABILIZATION_MS));
      console.log('✅ WebSocket stabilization complete');
    }

    // PHASE 2: Wait for connections to register if needed
    if (this.connections.size === 0) {
      console.log('⏳ ReconnectionCoordinator: No connections found, waiting for registrations...');
      
      const startTime = Date.now();
      let attempts = 0;
      
      // Retry loop: check every 500ms for up to 5 seconds
      while (this.connections.size === 0 && Date.now() - startTime < this.MAX_REGISTRATION_WAIT_MS) {
        attempts++;
        console.log(`⏳ ReconnectionCoordinator: Waiting for connections... (attempt ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, this.REGISTRATION_CHECK_INTERVAL_MS));
      }
      
      // Final check after waiting
      if (this.connections.size === 0) {
        console.log('🔄 ReconnectionCoordinator: No connections registered after waiting, skipping');
        return;
      }
      
      console.log(`✅ ReconnectionCoordinator: Found ${this.connections.size} connection(s) after ${attempts} attempts`);
    }

    const connectionCount = this.connections.size;

    // PHASE 3: Validate auth session before attempting any reconnections
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      console.warn('🔄 ReconnectionCoordinator: Invalid auth session, waiting for refresh');
      return;
    }

    console.log(`🔄 ReconnectionCoordinator: Starting reconnection for ${connectionCount} connections`);
    this.isReconnecting = true;

    try {
      // Sort connections by priority: consolidated > cell > showcaller
      const sortedConnections = Array.from(this.connections.entries()).sort((a, b) => {
        const priorityOrder = { consolidated: 0, cell: 1, showcaller: 2 };
        return priorityOrder[a[1].type] - priorityOrder[b[1].type];
      });

      console.log('📋 Reconnection order:', sortedConnections.map(([id, c]) => `${c.type}(${id})`).join(' → '));

      // Stagger reconnections with longer delays to prevent overwhelming WebSocket
      let delay = 0;
      for (const [id, connection] of sortedConnections) {
        // Check circuit breaker state
        if (connection.circuitState === 'open') {
          const timeSinceFailure = Date.now() - connection.lastFailureTime;
          if (timeSinceFailure < this.CIRCUIT_OPEN_DURATION_MS) {
            const retryIn = Math.ceil((this.CIRCUIT_OPEN_DURATION_MS - timeSinceFailure) / 1000);
            console.log(`🔄 ReconnectionCoordinator: Circuit open for ${id}, retrying in ${retryIn}s`);
            continue;
          } else {
            // Transition to half-open to test recovery
            console.log(`🔄 ReconnectionCoordinator: Circuit transitioning to half-open for ${id}`);
            connection.circuitState = 'half-open';
          }
        }

        // Check if this connection was recently reconnected
        const timeSinceLastReconnect = Date.now() - connection.lastReconnect;
        if (timeSinceLastReconnect < this.MIN_RECONNECTION_INTERVAL_MS) {
          console.log(`🔄 ReconnectionCoordinator: Skipping ${id}, reconnected ${Math.round(timeSinceLastReconnect / 1000)}s ago`);
          continue;
        }

        // Calculate exponential backoff delay
        const backoffDelay = Math.min(
          this.BASE_BACKOFF_DELAY_MS * Math.pow(2, connection.failedAttempts),
          this.MAX_BACKOFF_DELAY_MS
        );

        // Schedule staggered reconnection with backoff
        setTimeout(async () => {
          try {
            console.log(`🔄 ReconnectionCoordinator: Reconnecting ${connection.type}: ${id} (attempt ${connection.failedAttempts + 1})`);
            await connection.reconnect();
            connection.lastReconnect = Date.now();
            
            // Success: Reset circuit breaker
            connection.failedAttempts = 0;
            connection.circuitState = 'closed';
            connection.lastFailureTime = 0;
            
            console.log(`✅ ReconnectionCoordinator: Successfully reconnected ${id}`);
          } catch (error) {
            console.error(`❌ ReconnectionCoordinator: Failed to reconnect ${id}:`, error);
            
            // Track failure
            connection.failedAttempts++;
            connection.lastFailureTime = Date.now();
            
            // Check if circuit breaker should trip
            if (connection.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
              connection.circuitState = 'open';
              console.warn(`🔄 ReconnectionCoordinator: Circuit opened for ${id} after ${connection.failedAttempts} failures`);
            }
          }
        }, delay + backoffDelay);

        delay += this.STAGGER_DELAY_MS;
      }

      // Wait for all reconnections to complete
      await new Promise(resolve => setTimeout(resolve, delay + 1000));
      
      console.log('✅ ReconnectionCoordinator: Reconnection complete');
    } catch (error) {
      console.error('❌ ReconnectionCoordinator: Reconnection failed:', error);
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Reset reconnection cooldown (used after wake from sleep)
   */
  resetReconnectionCooldown(): void {
    console.log('🔄 Resetting reconnection cooldown');
    this.lastWebSocketCheckTime = 0;
    this.consecutiveWebSocketFailures = 0;
  }

  /**
   * Force immediate reconnection (useful for testing)
   */
  async forceReconnection() {
    console.log('🔄 ReconnectionCoordinator: Force reconnection requested');
    await this.executeReconnection();
  }

  /**
   * Cleanup and destroy coordinator
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkOnline.bind(this));
    }
    if (this.reconnectionDebounceTimer) {
      clearTimeout(this.reconnectionDebounceTimer);
    }
    if (this.websocketFailureResetTimer) {
      clearTimeout(this.websocketFailureResetTimer);
    }
    if (this.stuckOfflineTimer) {
      clearTimeout(this.stuckOfflineTimer);
    }
  }
}

// Export singleton instance
export const realtimeReconnectionCoordinator = new RealtimeReconnectionCoordinatorService();

// Make globally accessible for debugging and status checks
(window as any).__reconnectionCoordinator = realtimeReconnectionCoordinator;
