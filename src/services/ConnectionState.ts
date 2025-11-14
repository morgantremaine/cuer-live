/**
 * Unified Connection State
 * Single source of truth for all connection status
 */

type ConnectionStatus = 'connected' | 'syncing' | 'disconnected';

interface ConnectionState {
  status: ConnectionStatus;
  lastSync: number;
  lastCheck: number;
}

class ConnectionStateManager {
  private state: ConnectionState = {
    status: 'connected',
    lastSync: Date.now(),
    lastCheck: Date.now()
  };

  private listeners = new Set<(state: ConnectionState) => void>();

  getState(): ConnectionState {
    return { ...this.state };
  }

  setState(updates: Partial<ConnectionState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState()); // Immediate update
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

export const connectionState = new ConnectionStateManager();
