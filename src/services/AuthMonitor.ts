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
  async onTokenRefreshed(session: Session | null) {
    const timeSinceLastRefresh = Date.now() - this.lastTokenRefresh;
    console.log(`🔐 AuthMonitor: Token refreshed (${Math.round(timeSinceLastRefresh / 1000)}s since last refresh)`);
    
    this.currentSession = session;
    this.lastTokenRefresh = Date.now();
    
    // Wait for session to be fully validated before notifying
    // This gives Supabase client time to update internal auth state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Validate session is actually ready
    const isValid = await this.isSessionValid();
    if (isValid) {
      console.log('🔐 AuthMonitor: Session validated and ready, notifying listeners');
      this.notifyListeners(session);
    } else {
      console.warn('🔐 AuthMonitor: Session validation failed after refresh');
    }
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
   * Check if the current session is valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('🔐 AuthMonitor: Session invalid -', error?.message || 'no session');
        return false;
      }

      // Check if token is expired
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const isExpired = expiresAt <= now;

      if (isExpired) {
        console.log('🔐 AuthMonitor: Session expired');
        return false;
      }

      console.log('🔐 AuthMonitor: Session valid');
      return true;
    } catch (error) {
      console.error('🔐 AuthMonitor: Error checking session:', error);
      return false;
    }
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
