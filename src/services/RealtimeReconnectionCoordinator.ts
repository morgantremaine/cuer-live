import { authMonitor } from './AuthMonitor';
import { Session } from '@supabase/supabase-js';
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
 * Coordinates reconnections across all realtime systems when auth tokens are refreshed.
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
  private readonly RECONNECTION_DEBOUNCE_MS = 5000; // 5 seconds (allow auth propagation)
  private readonly WEBSOCKET_CHECK_COOLDOWN_MS = 5000; // Only check every 5 seconds
  private readonly MAX_WEBSOCKET_FAILURES = 3; // Stop retries after 3 failures
  private readonly WEBSOCKET_FAILURE_RESET_MS = 300000; // Reset after 5 minutes
  private readonly MIN_RECONNECTION_INTERVAL_MS = 10000; // 10 seconds minimum between reconnections
  private readonly STAGGER_DELAY_MS = 100; // Delay between individual reconnections
  private readonly MAX_FAILED_ATTEMPTS = 3; // Circuit breaker threshold
  private readonly CIRCUIT_OPEN_DURATION_MS = 60000; // 1 minute
  private readonly BASE_BACKOFF_DELAY_MS = 2000; // 2 seconds
  private readonly MAX_BACKOFF_DELAY_MS = 30000; // 30 seconds
  private readonly MAX_REGISTRATION_WAIT_MS = 5000; // Wait up to 5s for connections to register
  private readonly REGISTRATION_CHECK_INTERVAL_MS = 500; // Check every 500ms
  private readonly VISIBILITY_DEBOUNCE_MS = 2000; // Debounce visibility changes
  private readonly STUCK_OFFLINE_TIMEOUT_MS = 30000; // 30 seconds

  constructor() {
    // Register with auth monitor
    authMonitor.registerListener('realtime-coordinator', this.handleAuthChange.bind(this));
    
    // Add visibility change listener for wake-up detection
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }

  /**
   * Handle page visibility changes to detect wake-up from sleep
   */
  private async handleVisibilityChange() {
    // Only trigger on becoming visible
    if (document.visibilityState !== 'visible') return;
    
    const now = Date.now();
    const timeSinceLastChange = now - this.lastVisibilityChange;
    this.lastVisibilityChange = now;
    
    // Debounce rapid visibility changes
    if (timeSinceLastChange < this.VISIBILITY_DEBOUNCE_MS) {
      console.log('🔄 ReconnectionCoordinator: Ignoring rapid visibility change');
      return;
    }
    
    console.log('👁️ ReconnectionCoordinator: Page became visible, checking connections...');
    
    // Give browser 500ms to stabilize network
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force WebSocket health check
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
   * Handle auth state changes from AuthMonitor
   */
  private handleAuthChange(session: Session | null) {
    if (!session) {
      console.log('🔄 ReconnectionCoordinator: No session, skipping reconnection');
      return;
    }

    console.log('🔄 ReconnectionCoordinator: Auth changed, scheduling reconnection');
    this.scheduleReconnection();
  }

  /**
   * Schedule reconnection with debouncing
   */
  private scheduleReconnection() {
    // Clear existing debounce timer
    if (this.reconnectionDebounceTimer) {
      clearTimeout(this.reconnectionDebounceTimer);
    }

    // Debounce reconnection attempts
    this.reconnectionDebounceTimer = setTimeout(() => {
      this.executeReconnection();
    }, this.RECONNECTION_DEBOUNCE_MS);
  }

  /**
   * Execute reconnection for all registered connections
   */
  private async executeReconnection() {
    if (this.isReconnecting) {
      console.log('🔄 ReconnectionCoordinator: Already reconnecting, skipping');
      return;
    }

    // PHASE 0: Cooldown check to prevent rapid WebSocket reconnection attempts
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
          this.scheduleReconnection();
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
      
      // Wait for WebSocket to stabilize before proceeding
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      // Stagger reconnections to prevent overwhelming the system
      let delay = 0;
      for (const [id, connection] of this.connections.entries()) {
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
   * Force immediate reconnection (useful for testing)
   */
  async forceReconnection() {
    console.log('🔄 ReconnectionCoordinator: Force reconnection requested');
    await this.executeReconnection();
  }
}

// Export singleton instance
export const realtimeReconnectionCoordinator = new RealtimeReconnectionCoordinatorService();
