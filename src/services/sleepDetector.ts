/**
 * Sleep Detector Service
 * 
 * Detects laptop sleep by monitoring tab visibility duration.
 * Forces a page reload after laptop wake (> 60s hidden) to ensure fresh connections.
 * Ignores normal tab switching (< 60s hidden) to maintain smooth operation.
 */

class SleepDetector {
  private lastVisibleTime: number = Date.now();
  private isRunning: boolean = false;
  private readonly SLEEP_THRESHOLD_MS = 60000; // 60 seconds

  start(): void {
    if (this.isRunning) {
      console.warn('⚠️ Sleep detector already running');
      return;
    }

    this.isRunning = true;
    this.lastVisibleTime = Date.now();

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    console.log('👁️ Sleep detector started (threshold: 60s)');
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    console.log('👁️ Sleep detector stopped');
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Tab becoming hidden - record the time
      this.lastVisibleTime = Date.now();
      console.log('👁️ Tab hidden at', new Date(this.lastVisibleTime).toLocaleTimeString());
    } else {
      // Tab becoming visible - check how long it was hidden
      const now = Date.now();
      const hiddenDuration = now - this.lastVisibleTime;
      const hiddenSeconds = Math.round(hiddenDuration / 1000);

      console.log(`👁️ Tab visible after ${hiddenSeconds}s hidden`);

      if (hiddenDuration > this.SLEEP_THRESHOLD_MS) {
        // Laptop sleep detected - force reload for fresh connections
        console.log(`💤 Laptop sleep detected (hidden for ${hiddenSeconds}s), forcing reload...`);
        window.location.reload();
      } else {
        // Normal tab switch - do nothing, let existing reconnection logic handle it
        console.log(`✅ Normal tab switch (${hiddenSeconds}s), no reload needed`);
      }
    }
  };
}

// Export singleton instance
export const sleepDetector = new SleepDetector();
