/**
 * Visibility Sync Service
 * 
 * Detects when the tab becomes visible after being hidden and triggers
 * immediate data synchronization to prevent stale data issues.
 */

type SyncCallback = () => void | Promise<void>;

class VisibilitySyncService {
  private callbacks: Set<SyncCallback> = new Set();
  private wasHidden = false;
  private hiddenStartTime = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.wasHidden = true;
      this.hiddenStartTime = Date.now();
      console.log('👁️ Tab hidden - will sync on return');
    } else if (this.wasHidden) {
      const hiddenDuration = Date.now() - this.hiddenStartTime;
      const hiddenSeconds = Math.floor(hiddenDuration / 1000);
      
      console.log(`👁️ Tab visible after ${hiddenSeconds}s - triggering immediate sync`);
      
      // Trigger all registered sync callbacks
      this.triggerSync();
      
      this.wasHidden = false;
    }
  };

  /**
   * Register a callback to be called when tab becomes visible after being hidden
   */
  registerSyncCallback(callback: SyncCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unregister function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private async triggerSync() {
    console.log(`🔄 Triggering sync for ${this.callbacks.size} registered callbacks`);
    
    const syncPromises = Array.from(this.callbacks).map(async (callback) => {
      try {
        await callback();
      } catch (error) {
        console.error('Sync callback error:', error);
      }
    });

    await Promise.all(syncPromises);
  }

  destroy() {
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.callbacks.clear();
  }
}

// Export singleton instance
export const visibilitySyncService = new VisibilitySyncService();

// Make available for debugging
if (typeof window !== 'undefined') {
  (window as any).visibilitySyncService = visibilitySyncService;
}
