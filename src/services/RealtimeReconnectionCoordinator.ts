import { authMonitor } from './AuthMonitor';
import { Session } from '@supabase/supabase-js';

type ReconnectionHandler = () => Promise<void>;

interface RegisteredConnection {
  id: string;
  type: 'showcaller' | 'cell' | 'consolidated';
  reconnect: ReconnectionHandler;
  lastReconnect: number;
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
  private readonly RECONNECTION_DEBOUNCE_MS = 2000; // 2 seconds
  private readonly MIN_RECONNECTION_INTERVAL_MS = 5000; // 5 seconds minimum between reconnections
  private readonly STAGGER_DELAY_MS = 100; // Delay between individual reconnections

  constructor() {
    // Register with auth monitor
    authMonitor.registerListener('realtime-coordinator', this.handleAuthChange.bind(this));
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
      lastReconnect: 0
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
        lastReconnect: c.lastReconnect
      }))
    };
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

    const connectionCount = this.connections.size;
    if (connectionCount === 0) {
      console.log('🔄 ReconnectionCoordinator: No connections to reconnect');
      return;
    }

    console.log(`🔄 ReconnectionCoordinator: Starting reconnection for ${connectionCount} connections`);
    this.isReconnecting = true;

    try {
      // Stagger reconnections to prevent overwhelming the system
      let delay = 0;
      for (const [id, connection] of this.connections.entries()) {
        // Check if this connection was recently reconnected
        const timeSinceLastReconnect = Date.now() - connection.lastReconnect;
        if (timeSinceLastReconnect < this.MIN_RECONNECTION_INTERVAL_MS) {
          console.log(`🔄 ReconnectionCoordinator: Skipping ${id}, reconnected ${Math.round(timeSinceLastReconnect / 1000)}s ago`);
          continue;
        }

        // Schedule staggered reconnection
        setTimeout(async () => {
          try {
            console.log(`🔄 ReconnectionCoordinator: Reconnecting ${connection.type}: ${id}`);
            await connection.reconnect();
            connection.lastReconnect = Date.now();
            console.log(`✅ ReconnectionCoordinator: Successfully reconnected ${id}`);
          } catch (error) {
            console.error(`❌ ReconnectionCoordinator: Failed to reconnect ${id}:`, error);
          }
        }, delay);

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
