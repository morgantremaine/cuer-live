/**
 * Realtime Reconnection Coordinator (Simplified)
 * 
 * Simplified to work with ReliabilityManager
 * No complex sleep detection, WebSocket health checks, or reconnection storms
 * Just basic registration and coordination
 */

type ReconnectionHandler = () => Promise<void>;

interface RegisteredConnection {
  id: string;
  type: 'showcaller' | 'cell' | 'consolidated' | 'rundown' | 'presence';
  reconnect: ReconnectionHandler;
}

class RealtimeReconnectionCoordinatorService {
  private connections: Map<string, RegisteredConnection> = new Map();

  /**
   * Register a realtime connection
   */
  register(id: string, type: RegisteredConnection['type'], reconnect: ReconnectionHandler) {
    this.connections.set(id, {
      id,
      type,
      reconnect
    });
    console.log(`📡 Registered ${type} connection: ${id}`);
  }

  /**
   * Unregister a connection
   */
  unregister(id: string) {
    const existed = this.connections.delete(id);
    if (existed) {
      console.log(`📡 Unregistered connection: ${id}`);
    }
  }

  /**
   * Get all registered connections (for debugging)
   */
  getConnections(): RegisteredConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Cleanup
   */
  destroy() {
    this.connections.clear();
  }
}

// Export singleton instance
export const realtimeReconnectionCoordinator = new RealtimeReconnectionCoordinatorService();
