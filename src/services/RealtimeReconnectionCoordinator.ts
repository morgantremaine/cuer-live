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

// Constants for sleep detection
const LAPTOP_SLEEP_THRESHOLD_MS = 60000; // 60 seconds
const CUMULATIVE_FAILURE_WINDOW_MS = 300000; // 5 minutes
const MAX_CUMULATIVE_FAILURES = 10; // 10 failures in 5 minutes = reload

/**
 * Realtime Reconnection Coordinator
 * 
 * Coordinates reconnections through periodic health monitoring and network events.
 * Prevents cascading reconnection storms by staggering reconnection attempts.
 * Includes comprehensive sleep detection via multiple methods.
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
  
  // Sleep detection properties using performance API
  private lastPerformanceTime: number = performance.now();
  private lastSystemTime: number = Date.now();
  private cumulativeFailureWindow: Array<number> = []; // Track failure timestamps
  
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
  private readonly AGGRESSIVE_STUCK_TIMEOUT_MS = 15000; // 15 seconds after sleep
  private readonly CONNECTION_MONITOR_INTERVAL_MS = 60000; // Check every 60 seconds

  constructor() {
    // Add network online listener for wake-up detection
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkOnline.bind(this));
      
      // Sleep detection: visibilitychange
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Sleep detection: pageshow (bfcache)
      window.addEventListener('pageshow', this.handlePageShow);
      
      // Sleep detection: focus
      window.addEventListener('focus', this.handleFocus);
    }
    
    // Start proactive connection monitoring
    this.startConnectionMonitoring();
  }

  /**
   * Check if user is authenticated
   */
  private async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch {
      return false;
    }
  }

  /**
   * Handle visibility change events (tab switching, minimize, etc.)
   */
  private handleVisibilityChange = async () => {
    if (!document.hidden) {
      // Skip sleep detection if not authenticated
      if (!(await this.isAuthenticated())) {
        console.log('👁️ Tab visible, skipping sleep detection (unauthenticated)');
        return;
      }
      
      const { isSlept, duration } = this.detectSleep();
      
      if (isSlept) {
        console.log(`💤 Sleep detected via visibility change (${Math.round(duration/1000)}s), forcing reload...`);
        this.forceReload('laptop-sleep-visibility');
        return;
      }
      
      console.log('👁️ Tab became visible, no sleep detected');
    }
    // Don't check on hide - preserve timestamps for when tab becomes visible again
  };
  
  /**
   * Handle pageshow events (browser back/forward cache)
   */
  private handlePageShow = async (event: PageTransitionEvent) => {
    if (event.persisted) {
      // Skip sleep detection if not authenticated
      if (!(await this.isAuthenticated())) {
        console.log('📄 Page shown from bfcache, skipping sleep detection (unauthenticated)');
        return;
      }
      
      const { isSlept, duration } = this.detectSleep();
      
      if (isSlept) {
        console.log(`💤 Sleep detected via pageshow (${Math.round(duration/1000)}s), forcing reload...`);
        this.forceReload('laptop-sleep-pageshow');
        return;
      }
      
      console.log('📄 Page shown from bfcache, no sleep detected');
    }
  };
  
  /**
   * Handle window focus events
   */
  private handleFocus = async () => {
    // Skip sleep detection if not authenticated
    if (!(await this.isAuthenticated())) {
      console.log('🎯 Window focused, skipping sleep detection (unauthenticated)');
      return;
    }
    
    const { isSlept, duration } = this.detectSleep();
    
    if (isSlept) {
      console.log(`💤 Sleep detected via focus (${Math.round(duration/1000)}s), forcing reload...`);
      this.forceReload('laptop-sleep-focus');
      return;
    }
    
    console.log('🎯 Window focused, no sleep detected');
  };
  
  /**
   * Track connection failures over time window
   */
  private trackConnectionFailure() {
    const now = Date.now();
    this.cumulativeFailureWindow.push(now);
    
    // Remove failures older than the tracking window
    this.cumulativeFailureWindow = this.cumulativeFailureWindow.filter(
      timestamp => now - timestamp < CUMULATIVE_FAILURE_WINDOW_MS
    );
    
    // If we've had too many failures in the window, force reload
    if (this.cumulativeFailureWindow.length >= MAX_CUMULATIVE_FAILURES) {
      console.error(`⚠️ ${this.cumulativeFailureWindow.length} failures in ${CUMULATIVE_FAILURE_WINDOW_MS/1000}s - forcing reload`);
      this.forceReload('cumulative-failures');
    }
  }
  
  /**
   * Detect laptop sleep using performance API
   * Returns true if system time jumped significantly more than performance time
   */
  private detectSleep(): { isSlept: boolean; duration: number } {
    const nowPerf = performance.now();
    const nowSystem = Date.now();
    
    const perfDelta = nowPerf - this.lastPerformanceTime; // Actual JS execution time
    const systemDelta = nowSystem - this.lastSystemTime; // System clock time
    
    // If system clock jumped more than 60s ahead of JS execution time, laptop slept
    // This is immune to browser throttling because both clocks are throttled equally
    const timeDrift = systemDelta - perfDelta;
    const isSlept = timeDrift > LAPTOP_SLEEP_THRESHOLD_MS;
    
    if (isSlept) {
      console.log(`💤 Sleep detected: system time jumped ${Math.round(systemDelta/1000)}s, but JS only ran for ${Math.round(perfDelta/1000)}s (drift: ${Math.round(timeDrift/1000)}s)`);
    }
    
    // Update timestamps (always update, even if sleep detected, for next check)
    this.lastPerformanceTime = nowPerf;
    this.lastSystemTime = nowSystem;
    
    return { isSlept, duration: systemDelta };
  }
  
  /**
   * Centralized force reload method with reason tracking
   */
  private forceReload(reason: string) {
    console.error(`🔄 Force reload triggered: ${reason}`);
    // Immediate reload - no delays, no messaging
    window.location.reload();
  }

  /**
   * Handle network online event
   */
  private async handleNetworkOnline() {
    console.log('🌐 ReconnectionCoordinator: Network came online, checking for sleep...');
    
    // Skip sleep detection if not authenticated
    if (!(await this.isAuthenticated())) {
      console.log('🌐 Network online, skipping sleep detection (unauthenticated)');
      return;
    }
    
    const { isSlept, duration } = this.detectSleep();
    
    if (isSlept) {
      console.log(`💤 Sleep detected via network online (${Math.round(duration/1000)}s), forcing reload...`);
      this.forceReload('laptop-sleep-network');
      return;
    }
    
    // Give browser 1s to fully establish network
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Import health check utility
    const { websocketHealthCheck } = await import('@/utils/websocketHealth');
    
    // Check if WebSocket is already alive
    const isAlive = await websocketHealthCheck.isWebSocketAlive();
    
    if (isAlive) {
      console.log('✅ Network online - WebSocket already healthy, skipping reconnection');
      return;
    }
    
    console.log('⚠️ Network online - WebSocket dead, forcing reconnection');
    // Only reconnect if WebSocket is actually dead
    await this.executeReconnection();
  }

  /**
   * Start proactive connection monitoring for background tabs
   */
  private startConnectionMonitoring() {
    // Clear existing interval
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }
    
    // Check connection health every 60 seconds
    this.connectionMonitorInterval = setInterval(async () => {
      // Only check if we have registered connections
      if (this.connections.size === 0) return;
      
      // Only check if not already reconnecting
      if (this.isReconnecting) return;
      
      console.log('⏱️ Periodic connection health check...');
      
      // Skip sleep detection if not authenticated
      if (!(await this.isAuthenticated())) {
        console.log('⏱️ Periodic check, skipping sleep detection (unauthenticated)');
        return;
      }
      
      // Check for sleep (even in background tabs)
      const { isSlept, duration } = this.detectSleep();
      
      if (isSlept) {
        console.log(`💤 Sleep detected during periodic check (${Math.round(duration/1000)}s), forcing reload...`);
        this.forceReload('laptop-sleep-periodic');
        return;
      }
      
      // No sleep detected, proceed with normal health check
      const { websocketHealthCheck } = await import('@/utils/websocketHealth');
      
      // Quick non-blocking health check
      const isAlive = await websocketHealthCheck.isWebSocketAlive();
      
      if (!isAlive) {
        console.warn('⚠️ Periodic check detected dead WebSocket - triggering recovery');
        await this.executeReconnection();
      } else {
        console.log('✅ Periodic check: WebSocket healthy, no sleep detected');
      }
    }, this.CONNECTION_MONITOR_INTERVAL_MS);
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
      
      this.stuckOfflineTimer = setTimeout(() => {
        console.error(`⚠️ Still offline after ${this.STUCK_OFFLINE_TIMEOUT_MS/1000}s - forcing page reload`);
        this.forceReload('stuck-offline-timeout');
      }, this.STUCK_OFFLINE_TIMEOUT_MS);
      
      const reconnected = await websocketHealthCheck.forceWebSocketReconnect();
      
      if (!reconnected) {
        this.consecutiveWebSocketFailures++;
        this.trackConnectionFailure(); // Track for cumulative failure detection
        
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
        
        // Force reload after 3 consecutive failures
        if (this.consecutiveWebSocketFailures >= this.MAX_WEBSOCKET_FAILURES) {
          console.error('🔄 Max consecutive WebSocket failures reached - forcing page reload');
          this.forceReload('max-consecutive-failures');
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
            this.trackConnectionFailure(); // Track for cumulative failure detection
            
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

  /**
   * Cleanup and destroy coordinator
   */
  destroy() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
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
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('pageshow', this.handlePageShow);
      window.removeEventListener('focus', this.handleFocus);
    }
  }
}

// Export singleton instance
export const realtimeReconnectionCoordinator = new RealtimeReconnectionCoordinatorService();
