/**
 * Universal Time Service - Centralized time management to prevent device time discrepancies
 * This service replaces ALL direct Date.now() and new Date() calls across the application
 */

import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

interface TimeSyncState {
  serverTimeOffset: number; // Difference between server time and local time
  lastSyncTime: number; // When we last synced with server
  syncAttempts: number; // Number of sync attempts
  isTimeSynced: boolean; // Whether we have a reliable sync
  syncErrors: string[]; // Recent sync errors
  emergencyMode: boolean; // Disable external API calls if they consistently fail
  consecutiveFailures: number; // Track consecutive failures for emergency mode
}

class UniversalTimeService {
  private state: TimeSyncState = {
    serverTimeOffset: 0,
    lastSyncTime: 0,
    syncAttempts: 0,
    isTimeSynced: false,
    syncErrors: [],
    emergencyMode: false,
    consecutiveFailures: 0
  };

  private syncPromise: Promise<void> | null = null;
  private syncRetryTimeout: NodeJS.Timeout | null = null;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private readonly MAX_SYNC_ERRORS = 5;
  private readonly SYNC_RETRY_DELAY = 5000; // 5 seconds
  private readonly AUTO_SYNC_INTERVAL = 300000; // 5 minutes
  private readonly EMERGENCY_THRESHOLD = 5; // Enter emergency mode after 5 consecutive failures
  private readonly EMERGENCY_COOLDOWN = 600000; // 10 minutes before retrying after emergency mode

  constructor() {
    this.initializeAutoSync();
  }

  /**
   * Get current universal time in milliseconds (synchronized with server)
   * This replaces all Date.now() calls
   */
  public getUniversalTime(): number {
    const localTime = Date.now();
    
    if (!this.state.isTimeSynced && !this.state.emergencyMode) {
      // If we haven't synced yet and not in emergency mode, trigger sync and return local time
      this.syncWithServer().catch(() => {
        // Graceful degradation: if sync fails, just use local time
        console.warn('🕐 Time sync failed, using local system time');
      });
      return localTime;
    }

    // Return server-synchronized time if available, otherwise local time
    return localTime + this.state.serverTimeOffset;
  }

  /**
   * Get current universal Date object (synchronized with server)
   * This replaces all new Date() calls
   */
  public getUniversalDate(): Date {
    return new Date(this.getUniversalTime());
  }

  /**
   * Get current time in specific timezone using universal time
   * This ensures consistent timezone handling across all users
   */
  public getTimeInTimezone(timezone: string, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
    const universalTime = this.getUniversalTime();
    return formatInTimeZone(universalTime, timezone, format);
  }

  /**
   * Get current time drift between local and server time
   */
  public getTimeDrift(): number {
    return this.state.serverTimeOffset;
  }

  /**
   * Check if time is properly synchronized
   */
  public isTimeSynced(): boolean {
    return this.state.isTimeSynced && this.state.lastSyncTime > 0;
  }

  /**
   * Get sync status information
   */
  public getSyncStatus() {
    return {
      isTimeSynced: this.state.isTimeSynced,
      timeDrift: this.state.serverTimeOffset,
      lastSyncTime: this.state.lastSyncTime,
      syncAttempts: this.state.syncAttempts,
      recentErrors: this.state.syncErrors,
      emergencyMode: this.state.emergencyMode,
      consecutiveFailures: this.state.consecutiveFailures
    };
  }

  /**
   * Manually trigger time synchronization with server
   */
  public async syncWithServer(): Promise<void> {
    // Check if we're in emergency mode
    if (this.state.emergencyMode) {
      const timeSinceLastAttempt = Date.now() - this.state.lastSyncTime;
      if (timeSinceLastAttempt < this.EMERGENCY_COOLDOWN) {
        console.warn('🕐 Emergency mode active, skipping sync attempt');
        return;
      } else {
        // Try to exit emergency mode after cooldown
        console.log('🕐 Attempting to exit emergency mode');
        this.state.emergencyMode = false;
        this.state.consecutiveFailures = 0;
      }
    }

    // Prevent multiple simultaneous sync attempts
    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.performSync();
    
    try {
      await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  /**
   * Perform actual time synchronization
   */
  private async performSync(): Promise<void> {
    try {
      this.state.syncAttempts++;
      
      // Use multiple reliable time APIs with JSON responses and good CORS support
      const timeAPIs = [
        'https://worldtimeapi.org/api/timezone/UTC',
        'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
        'https://api.ipgeolocation.io/timezone?apiKey=free&tz=UTC'
      ];

      const syncResults = await Promise.allSettled(
        timeAPIs.map(url => this.fetchServerTime(url))
      );

      // Find all successful results and validate them
      const validResults: number[] = [];
      const localTime = Date.now();
      
      for (const result of syncResults) {
        if (result.status === 'fulfilled' && result.value !== null) {
          const serverTime = result.value;
          const offset = serverTime - localTime;
          
          // Only reject truly absurd offsets (more than 6 hours - likely API errors)
          // The APIs sometimes have discrepancies, but anything within 6 hours is acceptable
          if (Math.abs(offset) < 6 * 60 * 60 * 1000) { // 6 hours in ms
            validResults.push(serverTime);
            console.log('🕐 Valid time sync result:', {
              serverTime: new Date(serverTime).toISOString(),
              localTime: new Date(localTime).toISOString(),
              offset: offset
            });
          } else {
            console.warn('🕐 Rejected time sync with absurd offset:', {
              serverTime: new Date(serverTime).toISOString(),
              localTime: new Date(localTime).toISOString(),
              offset: offset
            });
          }
        }
      }

      if (validResults.length > 0) {
        // Use the first valid result, or average if multiple
        const serverTime = validResults.length === 1 
          ? validResults[0] 
          : Math.round(validResults.reduce((sum, time) => sum + time, 0) / validResults.length);
        
        const newOffset = serverTime - localTime;
        
        // Additional safety check: don't change offset dramatically unless it's the first sync
        // Increased threshold to 30 minutes to handle timezone/API inconsistencies better
        if (this.state.isTimeSynced && Math.abs(newOffset - this.state.serverTimeOffset) > 30 * 60 * 1000) {
          console.warn('🕐 Rejected dramatic time offset change:', {
            oldOffset: this.state.serverTimeOffset,
            newOffset: newOffset,
            difference: Math.abs(newOffset - this.state.serverTimeOffset)
          });
          return; // Don't update if the change is too dramatic
        }
        
        this.state.serverTimeOffset = newOffset;
        this.state.lastSyncTime = localTime;
        this.state.isTimeSynced = true;
        
        // Clear old errors and reset failure counter on successful sync
        this.state.syncErrors = [];
        this.state.consecutiveFailures = 0;
        
        // Exit emergency mode if we were in it
        if (this.state.emergencyMode) {
          console.log('🕐 Exiting emergency mode - sync successful');
          this.state.emergencyMode = false;
        }
        
        console.log('🕐 Time synchronized successfully', {
          serverTime: new Date(serverTime).toISOString(),
          localTime: new Date(localTime).toISOString(),
          offset: this.state.serverTimeOffset
        });
      } else {
        throw new Error('All time sync APIs returned invalid offsets');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.state.syncErrors.push(errorMessage);
      this.state.consecutiveFailures++;
      
      // Keep only recent errors
      if (this.state.syncErrors.length > this.MAX_SYNC_ERRORS) {
        this.state.syncErrors = this.state.syncErrors.slice(-this.MAX_SYNC_ERRORS);
      }

      // Enter emergency mode after consecutive failures
      if (this.state.consecutiveFailures >= this.EMERGENCY_THRESHOLD && !this.state.emergencyMode) {
        this.state.emergencyMode = true;
        this.state.lastSyncTime = Date.now(); // Track when we entered emergency mode
        console.warn(`🕐 Entering emergency mode after ${this.state.consecutiveFailures} consecutive failures. Using local system time.`);
        return; // Don't schedule retry in emergency mode
      }

      // Only log error if not in emergency mode to reduce spam
      if (!this.state.emergencyMode) {
        console.warn('🕐 Time sync failed, will retry:', errorMessage);
        // Schedule retry with exponential backoff
        this.scheduleRetry();
      }
    }
  }

  /**
   * Fetch server time from external API
   */
  private async fetchServerTime(url: string): Promise<number> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      let serverTime: number | null = null;
      
      // Handle different API response formats with enhanced parsing
      if (url.includes('worldtimeapi.org')) {
        // WorldTimeAPI format: { "datetime": "2025-07-30T18:30:00.000+00:00" }
        serverTime = data.datetime ? new Date(data.datetime).getTime() : null;
      } else if (url.includes('timeapi.io')) {
        // TimeAPI.io format: { "dateTime": "2025-07-30T18:30:00.000Z" }
        serverTime = data.dateTime ? new Date(data.dateTime).getTime() : null;
      } else if (url.includes('ipgeolocation.io')) {
        // IP Geolocation format: { "date_time_txt": "2025-07-30 18:30:00", "timezone": "UTC" }
        serverTime = data.date_time_txt ? new Date(data.date_time_txt + 'Z').getTime() : null;
      }

      if (serverTime && !isNaN(serverTime)) {
        console.log(`🕐 Successfully fetched time from ${url}:`, new Date(serverTime).toISOString());
        return serverTime;
      }
      
      throw new Error(`Invalid time response from ${url}: ${JSON.stringify(data)}`);
    } catch (error) {
      // Silent failure for individual API calls - let the caller handle aggregate logging
      throw error;
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  private scheduleRetry(): void {
    if (this.syncRetryTimeout) {
      clearTimeout(this.syncRetryTimeout);
    }

    // Use longer delays for network-related errors to avoid spamming failing APIs
    const baseDelay = this.state.consecutiveFailures >= 3 ? 30000 : this.SYNC_RETRY_DELAY; // 30s vs 5s
    const delay = Math.min(
      baseDelay * Math.pow(2, Math.min(this.state.syncAttempts - 1, 5)),
      300000 // Max 5 minute delay for persistent issues
    );

    this.syncRetryTimeout = setTimeout(() => {
      this.syncWithServer().catch(() => {
        // Graceful degradation on retry failure
      });
    }, delay);
  }

  /**
   * Initialize automatic periodic synchronization
   */
  private initializeAutoSync(): void {
    // Initial sync
    this.syncWithServer();

    // Set up periodic sync
    this.autoSyncInterval = setInterval(() => {
      this.syncWithServer();
    }, this.AUTO_SYNC_INTERVAL);

    // Sync when page becomes visible (handle sleep/wake)
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.syncWithServer();
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.syncRetryTimeout) {
      clearTimeout(this.syncRetryTimeout);
      this.syncRetryTimeout = null;
    }
    
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }
}

// Export singleton instance
export const universalTimeService = new UniversalTimeService();

// Export convenience functions to replace direct Date usage
export const getUniversalTime = (): number => universalTimeService.getUniversalTime();
export const getUniversalDate = (): Date => universalTimeService.getUniversalDate();
export const getTimeInTimezone = (timezone: string, format?: string): string => 
  universalTimeService.getTimeInTimezone(timezone, format);
export const syncTime = (): Promise<void> => universalTimeService.syncWithServer();
export const getTimeDrift = (): number => universalTimeService.getTimeDrift();
export const isTimeSynced = (): boolean => universalTimeService.isTimeSynced();
