/**
 * Sleep Detector Service
 * 
 * Detects laptop sleep through multiple methods:
 * - visibilitychange events (tab hidden/visible)
 * - pageshow events (bfcache restoration)
 * - focus events (window regains focus)
 * - Periodic heartbeat checks (time drift detection)
 * 
 * Forces a page reload after laptop wake (> 60s inactive) to ensure fresh connections.
 */

class SleepDetector {
  private lastActiveTime: number = Date.now();
  private isRunning: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly SLEEP_THRESHOLD_MS = 60000; // 60 seconds
  private readonly HEARTBEAT_INTERVAL_MS = 15000; // Check every 15 seconds

  start(): void {
    if (this.isRunning) {
      console.warn('⚠️ Sleep detector already running');
      return;
    }

    this.isRunning = true;
    this.lastActiveTime = Date.now();

    // Method 1: Visibility change (primary)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Method 2: Page show (bfcache restoration)
    window.addEventListener('pageshow', this.handlePageShow);
    
    // Method 3: Window focus (backup)
    window.addEventListener('focus', this.handleFocus);
    
    // Method 4: Periodic heartbeat (time drift detection)
    this.startHeartbeat();

    console.log('👁️ Sleep detector started with multi-layer detection (threshold: 60s)');
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pageshow', this.handlePageShow);
    window.removeEventListener('focus', this.handleFocus);
    
    this.stopHeartbeat();
    
    console.log('👁️ Sleep detector stopped');
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkForSleep();
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private checkForSleep(): void {
    const now = Date.now();
    const inactiveDuration = now - this.lastActiveTime;
    
    // If more than expected time has passed, we may have been asleep
    // Account for the heartbeat interval plus some margin
    const expectedMaxDuration = this.HEARTBEAT_INTERVAL_MS + 5000; // 5s margin
    
    if (inactiveDuration > this.SLEEP_THRESHOLD_MS && inactiveDuration > expectedMaxDuration) {
      const inactiveSeconds = Math.round(inactiveDuration / 1000);
      console.log(`💤 Sleep detected via heartbeat (inactive for ${inactiveSeconds}s), forcing reload...`);
      window.location.reload();
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Tab becoming hidden - record the time
      this.lastActiveTime = Date.now();
      console.log('👁️ Tab hidden at', new Date(this.lastActiveTime).toLocaleTimeString());
    } else {
      // Tab becoming visible - check how long it was hidden
      const now = Date.now();
      const hiddenDuration = now - this.lastActiveTime;
      const hiddenSeconds = Math.round(hiddenDuration / 1000);

      console.log(`👁️ Tab visible after ${hiddenSeconds}s hidden`);

      if (hiddenDuration > this.SLEEP_THRESHOLD_MS) {
        // Laptop sleep detected - force reload for fresh connections
        console.log(`💤 Laptop sleep detected (hidden for ${hiddenSeconds}s), forcing reload...`);
        window.location.reload();
      } else {
        // Normal tab switch - update last active time
        this.lastActiveTime = now;
        console.log(`✅ Normal tab switch (${hiddenSeconds}s), no reload needed`);
      }
    }
  };

  private handlePageShow = (event: PageTransitionEvent): void => {
    // Check if page is being restored from bfcache
    if (event.persisted) {
      const now = Date.now();
      const inactiveDuration = now - this.lastActiveTime;
      const inactiveSeconds = Math.round(inactiveDuration / 1000);
      
      console.log(`👁️ Page restored from bfcache after ${inactiveSeconds}s`);
      
      if (inactiveDuration > this.SLEEP_THRESHOLD_MS) {
        console.log(`💤 Sleep detected via pageshow (${inactiveSeconds}s), forcing reload...`);
        window.location.reload();
      } else {
        this.lastActiveTime = now;
      }
    }
  };

  private handleFocus = (): void => {
    const now = Date.now();
    const inactiveDuration = now - this.lastActiveTime;
    const inactiveSeconds = Math.round(inactiveDuration / 1000);
    
    console.log(`👁️ Window focus after ${inactiveSeconds}s`);
    
    if (inactiveDuration > this.SLEEP_THRESHOLD_MS) {
      console.log(`💤 Sleep detected via focus (${inactiveSeconds}s), forcing reload...`);
      window.location.reload();
    } else {
      this.lastActiveTime = now;
    }
  };
}

// Export singleton instance
export const sleepDetector = new SleepDetector();
