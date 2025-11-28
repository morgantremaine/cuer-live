import { supabase } from '@/integrations/supabase/client';
import { websocketHealthCheck } from '@/utils/websocketHealth';
import { handleChunkLoadError, shouldSkipChunkReload } from '@/utils/chunkLoadErrorHandler';
import { toast } from 'sonner';

type ReconnectionHandler = () => Promise<void>;

interface RegisteredConnection {
  id: string;
  type: 'showcaller' | 'cell' | 'consolidated' | 'rundown' | 'presence';
  reconnect: ReconnectionHandler;
  lastErrorTime?: number; // Track when errors occur
}

// Constants for sleep detection (increased thresholds to reduce false positives)
const LAPTOP_SLEEP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes (was 60s)

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
  private connectionMonitorInterval: NodeJS.Timeout | null = null;
  
  // Sleep detection properties using performance API
  private lastPerformanceTime: number = performance.now();
  private lastSystemTime: number = Date.now();
  
  // Track last visible time to differentiate sleep from long background time
  private lastVisibleTime: number = Date.now();
  private readonly LONG_ABSENCE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours (was 30 min)
  private readonly SHORT_BACKGROUND_MAX_MS = 15 * 60 * 1000; // 15 minutes (was 5 min)
  
  // Visibility-based throttling to prevent timer buildup
  private isTabVisible: boolean = true;
  private readonly CONNECTION_MONITOR_INTERVAL_ACTIVE = 60000; // 60s when active (was 30s)
  private readonly CONNECTION_MONITOR_INTERVAL_HIDDEN = 120000; // 120s when hidden (was 60s)
  
  // Connection health tracking - aggressive auto-reload
  private consecutiveFailures: number = 0;
  private readonly MAX_FAILURES_BEFORE_RELOAD = 4; // 4 failures (~4 minutes)
  private readonly GRACE_PERIOD_MS = 30000; // 30 second grace period
  private lastFailureTime: number = 0;
  private isInGracePeriod: boolean = false;
  private gracePeriodTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

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
  private handleVisibilityChange = () => {
    if (!document.hidden) {
      // Tab became visible - update timestamps and let periodic check handle any issues
      this.isTabVisible = true;
      this.lastVisibleTime = Date.now();
      
      // Update performance timestamps for next sleep detection
      this.lastPerformanceTime = performance.now();
      this.lastSystemTime = Date.now();
      
      console.log('👁️ Tab visible - monitoring will check connection health');
      
      // Restart monitoring with active interval
      this.restartConnectionMonitoring();
    } else {
      // Tab became hidden - throttle monitoring
      this.isTabVisible = false;
      this.restartConnectionMonitoring();
    }
  };
  
  /**
   * Handle pageshow events (browser back/forward cache)
   */
  private handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      // Page restored from bfcache - update timestamps and let periodic check handle any issues
      this.lastVisibleTime = Date.now();
      this.lastPerformanceTime = performance.now();
      this.lastSystemTime = Date.now();
      
      console.log('📄 Page shown from bfcache - monitoring will check connection health');
    }
  };
  
  /**
   * Handle window focus events
   */
  private handleFocus = () => {
    // Window gained focus - update timestamps and let periodic check handle any issues
    this.lastVisibleTime = Date.now();
    this.lastPerformanceTime = performance.now();
    this.lastSystemTime = Date.now();
    
    console.log('🎯 Window focused - monitoring will check connection health');
  };
  
  
  /**
   * Detect laptop sleep or long absence
   * Returns shouldReload=true only if:
   * 1. Actual laptop sleep detected (large time drift in short background period)
   * 2. Very long absence (30+ minutes backgrounded)
   */
  private detectSleep(): { isSlept: boolean; duration: number; shouldReload: boolean } {
    const nowPerf = performance.now();
    const nowSystem = Date.now();
    
    const perfDelta = nowPerf - this.lastPerformanceTime; // Actual JS execution time
    const systemDelta = nowSystem - this.lastSystemTime; // System clock time
    const timeSinceVisible = nowSystem - this.lastVisibleTime; // Time since tab was last visible
    
    // Calculate time drift (system clock vs JS execution)
    const timeDrift = systemDelta - perfDelta;
    const hasLargeDrift = timeDrift > LAPTOP_SLEEP_THRESHOLD_MS;
    
    // Check for very long absence
    const isLongAbsence = timeSinceVisible > this.LONG_ABSENCE_THRESHOLD_MS;
    
    // Determine if this is actual sleep vs browser throttling
    // If drift is large BUT tab was only backgrounded for a short time, it's actual sleep
    // If drift is large and tab was backgrounded for a medium time (5-30 min), it's probably just throttling
    const isActualSleep = hasLargeDrift && timeSinceVisible < this.SHORT_BACKGROUND_MAX_MS;
    
    // Only reload if it's actual sleep OR very long absence
    const shouldReload = isActualSleep || isLongAbsence;
    
    if (hasLargeDrift) {
      if (isActualSleep) {
        console.log(`💤 Actual sleep detected: ${Math.round(timeDrift/1000)}s drift in ${Math.round(timeSinceVisible/1000)}s absence - WILL RELOAD`);
      } else if (isLongAbsence) {
        console.log(`⏰ Long absence detected: ${Math.round(timeSinceVisible/1000/60)}min backgrounded - WILL RELOAD`);
      } else {
        console.log(`🕒 Browser throttling detected: ${Math.round(timeDrift/1000)}s drift in ${Math.round(timeSinceVisible/1000)}s absence - no reload needed`);
      }
    }
    
    // Update timestamps (always update, even if sleep detected, for next check)
    this.lastPerformanceTime = nowPerf;
    this.lastSystemTime = nowSystem;
    
    return { isSlept: hasLargeDrift, duration: systemDelta, shouldReload };
  }
  
  /**
   * Centralized force reload method with reason tracking
   */
  private forceReload(reason: string) {
    console.error(`🔄 Force reload triggered: ${reason}`);
    toast.error("Connection could not be restored", {
      description: "Refreshing page in 3 seconds to recover...",
      duration: 3000,
    });
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }

  /**
   * Handle network online event
   */
  private async handleNetworkOnline() {
    console.log('🌐 Network came online, updating timestamps');
    
    // Skip if not authenticated
    if (!(await this.isAuthenticated())) {
      console.log('🌐 Network online, skipping check (unauthenticated)');
      return;
    }
    
    // Update timestamps and let periodic monitoring handle connection health
    this.lastVisibleTime = Date.now();
    this.lastPerformanceTime = performance.now();
    this.lastSystemTime = Date.now();
    
    // Wait for DNS to stabilize after wake from sleep
    console.log('⏳ Waiting for DNS stabilization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Skip if we recently reloaded for chunk errors
    if (shouldSkipChunkReload()) {
      console.log('⏭️ Skipping check - recently reloaded for chunk error');
      return;
    }
    
    // Check if WebSocket is dead - but give it a grace period to reconnect
    try {
      const isAlive = await websocketHealthCheck.isWebSocketAlive();
      
      if (!isAlive) {
        console.warn('🔌 Network online but WebSocket appears dead - giving grace period...');
        
        // Wait 10 seconds and check again before reloading
        setTimeout(async () => {
          const retryAlive = await websocketHealthCheck.isWebSocketAlive();
          if (!retryAlive) {
            console.error('❌ WebSocket still dead after grace period - forcing reload');
            this.forceReload('network-online-websocket-dead-confirmed');
          } else {
            console.log('✅ WebSocket recovered during grace period');
          }
        }, 10000);
      } else {
        console.log('✅ Network online and WebSocket healthy');
      }
    } catch (error: any) {
      console.error('❌ Error checking WebSocket health on network online:', error);
      handleChunkLoadError(error, 'network-online-websocket-check');
    }
  }
  
  /**
   * Check if multiple channels are failing simultaneously (cascade)
   */
  private detectChannelCascade(): boolean {
    const now = Date.now();
    const recentFailures = Array.from(this.connections.values()).filter(conn => {
      // Check if connection reported error in last 5 seconds
      return conn.lastErrorTime && (now - conn.lastErrorTime) < 5000;
    });
    
    return recentFailures.length >= 3; // 3+ channels failing = cascade
  }

  /**
   * Handle cascade by staggering reconnections
   */
  private async handleCascadeReconnection() {
    console.warn('🌊 Cascade failure detected - staggering reconnections');
    
    const connections = Array.from(this.connections.values());
    for (let i = 0; i < connections.length; i++) {
      // Wait 2 seconds between each reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 2000 * i));
      await connections[i].reconnect();
    }
  }

  /**
   * Restart connection monitoring with appropriate interval based on visibility
   */
  private restartConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }
    this.startConnectionMonitoring();
  }

  /**
   * Start proactive connection monitoring with visibility-based throttling
   */
  private startConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }

    // Use different intervals based on tab visibility
    const interval = this.isTabVisible 
      ? this.CONNECTION_MONITOR_INTERVAL_ACTIVE 
      : this.CONNECTION_MONITOR_INTERVAL_HIDDEN;

    this.connectionMonitorInterval = setInterval(async () => {
      if (this.isReconnecting) return;
      
      // Skip if not authenticated
      if (!(await this.isAuthenticated())) {
        return;
      }
      
      // Check for sleep first
      const { shouldReload, duration } = this.detectSleep();
      
      if (shouldReload) {
        console.warn(`🔄 Periodic check detected reload condition (${Math.round(duration / 1000 / 60)}min) - forcing reload`);
        this.forceReload('periodic-sleep-or-long-absence-detected');
        return;
      }
      
      // Check WebSocket health with grace period and retry logic
      try {
        const isAlive = await websocketHealthCheck.isWebSocketAlive();
        
        if (!isAlive) {
          this.consecutiveFailures++;
          this.lastFailureTime = Date.now();
          
          console.warn(`⚠️ WebSocket health check failed (${this.consecutiveFailures}/${this.MAX_FAILURES_BEFORE_RELOAD})`);
          
          // Only reload after multiple consecutive failures AND grace period has passed
          if (this.consecutiveFailures >= this.MAX_FAILURES_BEFORE_RELOAD) {
            const timeSinceFirstFailure = Date.now() - this.lastFailureTime;
            
            if (timeSinceFirstFailure >= this.GRACE_PERIOD_MS) {
              console.error(`❌ WebSocket dead after ${this.consecutiveFailures} failures and ${Math.round(timeSinceFirstFailure/1000)}s grace period - forcing reload`);
              this.forceReload('periodic-check-websocket-dead-confirmed');
            } else {
              console.log(`⏳ Giving WebSocket more time to reconnect (${Math.round((this.GRACE_PERIOD_MS - timeSinceFirstFailure)/1000)}s remaining)`);
            }
          }
        } else {
          // Reset failure counter on successful health check
          if (this.consecutiveFailures > 0) {
            console.log(`✅ WebSocket recovered after ${this.consecutiveFailures} failures`);
          }
          this.consecutiveFailures = 0;
          this.lastFailureTime = 0;
        }
      } catch (error: any) {
        console.error('❌ Error in periodic WebSocket check:', error);
        this.consecutiveFailures++;
        handleChunkLoadError(error, 'periodic-websocket-check');
      }
    }, interval);
  }

  /**
   * Register a realtime connection (for debugging/visibility only)
   */
  register(id: string, type: RegisteredConnection['type'], reconnect: ReconnectionHandler) {
    this.connections.set(id, {
      id,
      type,
      reconnect
    });
  }

  /**
   * Unregister a connection
   */
  unregister(id: string) {
    console.log(`📋 Unregistered connection: ${id}`);
    this.connections.delete(id);
  }

  /**
   * Get reconnection status (for debugging)
   */
  getStatus() {
    return {
      isReconnecting: this.isReconnecting,
      connectionCount: this.connections.size,
      connections: Array.from(this.connections.values()).map(c => ({
        id: c.id,
        type: c.type
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
   * Execute reconnection - simplified to just force reload on dead WebSocket
   */
  private async executeReconnection() {
    if (this.isReconnecting) {
      console.log('🔄 Already reconnecting, skipping');
      return;
    }

    this.isReconnecting = true;

    try {
      // Check if WebSocket is actually dead before forcing reload
      try {
        const isWebSocketAlive = await websocketHealthCheck.isWebSocketAlive();
        
        if (!isWebSocketAlive) {
          console.warn('🔌 WebSocket is dead - forcing immediate page reload');
          this.forceReload('websocket-dead');
        } else {
          console.log('✅ WebSocket is alive - no reload needed');
        }
      } catch (error: any) {
        console.error('❌ Error during reconnection WebSocket check:', error);
        handleChunkLoadError(error, 'reconnection-websocket-check');
      }
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Get connection status for UI components
   */
  getConnectionStatus(): {
    isHealthy: boolean;
    isReconnecting: boolean;
    consecutiveFailures: number;
  } {
    return {
      isHealthy: this.consecutiveFailures === 0,
      isReconnecting: this.isReconnecting,
      consecutiveFailures: this.consecutiveFailures
    };
  }

  /**
   * Force immediate reconnection (useful for testing)
   */
  async forceReconnection() {
    console.log('🔄 Force reconnection requested');
    await this.executeReconnection();
  }

  /**
   * Coordinate reconnection across all registered channels
   * Clears stuck reconnection states and staggers reconnection attempts
   */
  async coordinateChannelReconnections(): Promise<void> {
    console.log('🔄 Coordinating channel reconnections across all managers');

    // Import broadcast managers
    const { showcallerBroadcast } = await import('@/utils/showcallerBroadcast');
    const { cellBroadcast } = await import('@/utils/cellBroadcast');

    // Clear all stuck reconnection states
    const connectionKeys = Array.from(this.connections.keys());
    
    connectionKeys.forEach(key => {
      // Extract rundown ID from connection key (format: "type-rundownId")
      const rundownId = key.split('-').slice(1).join('-');
      
      if (key.startsWith('showcaller-')) {
        showcallerBroadcast.clearReconnectingState(rundownId);
      } else if (key.startsWith('cell-')) {
        cellBroadcast.clearReconnectingState(rundownId);
      }
    });

    // Stagger reconnection attempts to prevent connection storm
    for (let i = 0; i < connectionKeys.length; i++) {
      const key = connectionKeys[i];
      const rundownId = key.split('-').slice(1).join('-');

      setTimeout(() => {
        if (key.startsWith('showcaller-')) {
          console.log(`🔄 Reconnecting showcaller for: ${rundownId}`);
          showcallerBroadcast.forceReconnect(rundownId);
        } else if (key.startsWith('cell-')) {
          console.log(`🔄 Reconnecting cell broadcast for: ${rundownId}`);
          cellBroadcast.forceReconnect(rundownId);
        }
      }, i * 500); // 500ms delay between each reconnection
    }
  }

  /**
   * Cleanup and destroy coordinator
   */
  destroy() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.gracePeriodTimeout) {
      clearTimeout(this.gracePeriodTimeout);
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
