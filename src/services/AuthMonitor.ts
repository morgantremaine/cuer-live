import { Session } from '@supabase/supabase-js';

type AuthEventType = 'TOKEN_REFRESHED' | 'SIGNED_OUT' | 'SIGNED_IN' | 'TOKEN_EXPIRING';
type AuthEventListener = (session: Session | null) => void;

/**
 * Global Auth Monitor Service
 * 
 * Centralized service for tracking Supabase auth state changes and notifying
 * realtime systems when tokens are refreshed or auth state changes.
 */
class AuthMonitorService {
  private listeners: Map<string, AuthEventListener> = new Map();
  private currentSession: Session | null = null;
  private lastTokenRefresh: number = Date.now();

  /**
   * Register a listener for auth state changes
   */
  registerListener(id: string, callback: AuthEventListener) {
    console.log(`🔐 AuthMonitor: Registered listener ${id}`);
    this.listeners.set(id, callback);
  }

  /**
   * Unregister a listener
   */
  unregisterListener(id: string) {
    console.log(`🔐 AuthMonitor: Unregistered listener ${id}`);
    this.listeners.delete(id);
  }

  /**
   * Notify when token is refreshed
   */
  onTokenRefreshed(session: Session | null) {
    const timeSinceLastRefresh = Date.now() - this.lastTokenRefresh;
    console.log(`🔐 AuthMonitor: Token refreshed (${Math.round(timeSinceLastRefresh / 1000)}s since last refresh)`);
    
    this.currentSession = session;
    this.lastTokenRefresh = Date.now();
    this.notifyListeners(session);
  }

  /**
   * Notify when user signs out
   */
  onSignedOut() {
    console.log('🔐 AuthMonitor: User signed out');
    this.currentSession = null;
    this.notifyListeners(null);
  }

  /**
   * Notify when user signs in
   */
  onSignedIn(session: Session | null) {
    console.log('🔐 AuthMonitor: User signed in');
    this.currentSession = session;
    this.lastTokenRefresh = Date.now();
    this.notifyListeners(session);
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Check if token was recently refreshed (within last 5 seconds)
   */
  wasRecentlyRefreshed(): boolean {
    const timeSinceRefresh = Date.now() - this.lastTokenRefresh;
    return timeSinceRefresh < 5000; // 5 seconds
  }

  /**
   * Notify all registered listeners
   */
  private notifyListeners(session: Session | null) {
    console.log(`🔐 AuthMonitor: Notifying ${this.listeners.size} listeners`);
    this.listeners.forEach((callback, id) => {
      try {
        callback(session);
      } catch (error) {
        console.error(`🔐 AuthMonitor: Error notifying listener ${id}:`, error);
      }
    });
  }
}

// Export singleton instance
export const authMonitor = new AuthMonitorService();
