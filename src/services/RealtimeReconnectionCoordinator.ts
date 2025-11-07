import { supabase } from '@/integrations/supabase/client';

type ReconnectionHandler = () => Promise<void>;

interface RegisteredConnection {
  id: string;
  type: 'showcaller' | 'cell' | 'consolidated' | 'rundown' | 'presence';
  reconnect: ReconnectionHandler;
}

// Constants for sleep detection
const LAPTOP_SLEEP_THRESHOLD_MS = 60000; // 60 seconds

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
  
  private readonly CONNECTION_MONITOR_INTERVAL_MS = 30000; // Check every 30 seconds

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
    console.log('🌐 Network came online, checking connection...');
    
    // Skip if not authenticated
    if (!(await this.isAuthenticated())) {
      console.log('🌐 Network online, skipping check (unauthenticated)');
      return;
    }
    
    // Check for sleep first
    const { isSlept } = this.detectSleep();
    
    if (isSlept) {
      console.warn('💤 Sleep detected via network online - forcing reload');
      this.forceReload('laptop-sleep-network');
      return;
    }
    
    // Check if WebSocket is dead
    const { websocketHealthCheck } = await import('@/utils/websocketHealth');
    const isAlive = await websocketHealthCheck.isWebSocketAlive();
    
    if (!isAlive) {
      console.warn('🔌 Network online but WebSocket dead - forcing reload');
      this.forceReload('network-online-websocket-dead');
    } else {
      console.log('✅ Network online and WebSocket healthy');
    }
  }

  /**
   * Start proactive connection monitoring
   */
  private startConnectionMonitoring() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }

    this.connectionMonitorInterval = setInterval(async () => {
      if (this.isReconnecting) return;
      
      console.log('⏱️ Periodic connection health check...');
      
      // Skip if not authenticated
      if (!(await this.isAuthenticated())) {
        console.log('⏱️ Periodic check, skipping (unauthenticated)');
        return;
      }
      
      // Check for sleep first
      const { isSlept, duration } = this.detectSleep();
      
      if (isSlept) {
        console.warn(`💤 Periodic check detected system sleep (${Math.round(duration / 1000 / 60)}min) - forcing reload`);
        this.forceReload('periodic-sleep-detected');
        return;
      }
      
      // Check WebSocket health
      const { websocketHealthCheck } = await import('@/utils/websocketHealth');
      const isAlive = await websocketHealthCheck.isWebSocketAlive();
      
      if (!isAlive) {
        console.warn('⚠️ Periodic check detected dead WebSocket - forcing reload');
        this.forceReload('periodic-check-websocket-dead');
      } else {
        console.log('✅ Periodic check: WebSocket healthy');
      }
    }, this.CONNECTION_MONITOR_INTERVAL_MS);
  }

  /**
   * Register a realtime connection (for debugging/visibility only)
   */
  register(id: string, type: RegisteredConnection['type'], reconnect: ReconnectionHandler) {
    console.log(`📋 Registered ${type} connection: ${id}`);
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
      const { websocketHealthCheck } = await import('@/utils/websocketHealth');
      const isWebSocketAlive = await websocketHealthCheck.isWebSocketAlive();
      
      if (!isWebSocketAlive) {
        console.warn('🔌 WebSocket is dead - forcing immediate page reload');
        this.forceReload('websocket-dead');
      } else {
        console.log('✅ WebSocket is alive - no reload needed');
      }
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Force immediate reconnection (useful for testing)
   */
  async forceReconnection() {
    console.log('🔄 Force reconnection requested');
    await this.executeReconnection();
  }

  /**
   * Cleanup and destroy coordinator
   */
  destroy() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
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
