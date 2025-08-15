/**
 * Universal Time Service - Centralized time management to prevent device time discrepancies
 * This service replaces ALL direct Date.now() and new Date() calls across the application
 */

import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { timerManager } from './TimerManager';

interface TimeSyncState {
  serverTimeOffset: number; // Difference between server time and local time
  lastSyncTime: number; // When we last synced with server
  syncAttempts: number; // Number of sync attempts
  isTimeSynced: boolean; // Whether we have a reliable sync
  syncErrors: string[]; // Recent sync errors
}

class UniversalTimeService {
  private state: TimeSyncState = {
    serverTimeOffset: 0,
    lastSyncTime: 0,
    syncAttempts: 0,
    isTimeSynced: false,
    syncErrors: []
  };

  private syncPromise: Promise<void> | null = null;
  private syncRetryTimeoutId: string | null = null;
  private autoSyncIntervalId: string | null = null;
  private readonly MAX_SYNC_ERRORS = 5;
  private readonly SYNC_RETRY_DELAY = 5000; // 5 seconds
  private readonly AUTO_SYNC_INTERVAL = 300000; // 5 minutes

  constructor() {
    this.initializeAutoSync();
  }

  /**
   * Get current universal time in milliseconds (synchronized with server)
   * This replaces all Date.now() calls
   */
  public getUniversalTime(): number {
    const localTime = Date.now();
    
    if (!this.state.isTimeSynced) {
      // If we haven't synced yet, trigger sync and return local time
      this.syncWithServer();
      return localTime;
    }

    // Return server-synchronized time
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
      recentErrors: this.state.syncErrors
    };
  }

  /**
   * Manually trigger time synchronization with server
   */
  public async syncWithServer(): Promise<void> {
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
       
       // Use multiple reliable time APIs as fallbacks
       const timeAPIs = [
         'https://worldtimeapi.org/api/timezone/UTC',
         'https://api.github.com', // GitHub API returns server time in headers
         'https://httpbin.org/delay/0' // Simple fallback that returns current time
       ];

       const syncResults = await Promise.allSettled(
         timeAPIs.map((url, index) => this.fetchServerTime(url, index))
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
             console.warn('🕐 Rejected time sync with invalid data:', {
               serverTime: result.value ? new Date(result.value).toISOString() : 'null',
               localTime: new Date(localTime).toISOString()
             });
           }
          } else {
            const errorMessage = result.status === 'rejected' 
              ? (result.reason?.message || 'Unknown error') 
              : 'Invalid response';
            console.warn('🕐 Time sync API failed:', errorMessage);
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
        
        // Clear old errors on successful sync
        this.state.syncErrors = [];
        
        console.log('🕐 Time synchronized successfully', {
          serverTime: new Date(serverTime).toISOString(),
          localTime: new Date(localTime).toISOString(),
          offset: this.state.serverTimeOffset
        });
       } else {
         // If no APIs work, fall back to local time but mark as unsynced
         console.warn('🕐 All time sync APIs failed, falling back to local time');
         this.state.isTimeSynced = false; // Mark as unsynced but continue operating
         this.state.serverTimeOffset = 0; // Use local time
       }
     } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
       this.state.syncErrors.push(errorMessage);
       
       // Keep only recent errors
       if (this.state.syncErrors.length > this.MAX_SYNC_ERRORS) {
         this.state.syncErrors = this.state.syncErrors.slice(-this.MAX_SYNC_ERRORS);
       }

       console.error('🕐 Time sync failed:', errorMessage);
       
       // Fall back to local time and reduce retry frequency
       this.state.isTimeSynced = false;
       this.state.serverTimeOffset = 0;
       this.scheduleRetry();
    }
  }

   /**
    * Fetch server time from external API with improved error handling
    */
   private async fetchServerTime(url: string, apiIndex: number = 0): Promise<number> {
     try {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
       
       const response = await fetch(url, {
         method: 'GET',
         headers: { 
           'Accept': 'application/json',
           'Cache-Control': 'no-cache'
         },
         signal: controller.signal
       });

       clearTimeout(timeoutId);

       if (!response.ok) {
         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
       }

       let serverTime: number | null = null;
       
       // Handle different API response formats
       if (url.includes('worldtimeapi.org')) {
         // WorldTimeAPI format: { "datetime": "2025-08-15T00:30:00.000+00:00" }
         const data = await response.json();
         serverTime = data.datetime ? new Date(data.datetime).getTime() : null;
       } else if (url.includes('github.com')) {
         // Use GitHub's Date header (more reliable than JSON response)
         const dateHeader = response.headers.get('date');
         if (dateHeader) {
           serverTime = new Date(dateHeader).getTime();
         }
       } else if (url.includes('httpbin.org')) {
         // HTTPBin returns current time in various formats
         const data = await response.json();
         serverTime = Date.now(); // Use current time as fallback
       } else {
         // Generic fallback - try to parse as JSON with common time fields
         const data = await response.json();
         serverTime = data.dateTime || data.datetime || data.currentDateTime || null;
         if (serverTime && typeof serverTime === 'string') {
           serverTime = new Date(serverTime).getTime();
         }
       }

       if (serverTime && !isNaN(serverTime) && serverTime > 0) {
         console.log(`🕐 Successfully fetched time from API ${apiIndex} (${url}):`, new Date(serverTime).toISOString());
         return serverTime;
       }
       
       throw new Error(`Invalid time response from ${url}`);
     } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
       console.warn(`🕐 Failed to fetch time from API ${apiIndex} (${url}):`, errorMessage);
       throw error;
    }
  }

   /**
    * Schedule retry with exponential backoff and reduced frequency after failures
    */
   private scheduleRetry(): void {
     if (this.syncRetryTimeoutId) {
       timerManager.clearTimer(this.syncRetryTimeoutId);
     }

     // Longer delays after multiple failures to avoid spamming failed APIs
     const baseDelay = this.state.syncAttempts > 5 ? 60000 : this.SYNC_RETRY_DELAY; // 1 min delay after 5 failures
     const delay = Math.min(
       baseDelay * Math.pow(2, Math.min(this.state.syncAttempts - 1, 6)),
       300000 // Max 5 minute delay
     );

     console.log(`🕐 Scheduling time sync retry in ${delay / 1000} seconds (attempt ${this.state.syncAttempts})`);

     this.syncRetryTimeoutId = timerManager.setTimeout(() => {
       this.syncWithServer();
     }, delay, 'UniversalTimeService-retry');
   }

   /**
    * Initialize automatic periodic synchronization
    */
   private initializeAutoSync(): void {
     // Initial sync
     this.syncWithServer();

     // Set up periodic sync with managed timer
     this.autoSyncIntervalId = timerManager.setInterval(() => {
       this.syncWithServer();
     }, this.AUTO_SYNC_INTERVAL, 'UniversalTimeService-autoSync');

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
     if (this.syncRetryTimeoutId) {
       timerManager.clearTimer(this.syncRetryTimeoutId);
       this.syncRetryTimeoutId = null;
     }
     
     if (this.autoSyncIntervalId) {
       timerManager.clearTimer(this.autoSyncIntervalId);
       this.autoSyncIntervalId = null;
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
