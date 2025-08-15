/**
 * Simplified Universal Time Service
 * Uses Supabase server timestamps as the single source of truth
 * Eliminates external API dependencies and provides consistent timing
 */

import { formatInTimeZone } from 'date-fns-tz';

interface TimeSyncState {
  serverTimeOffset: number; // Difference between server time and local time
  lastSyncTime: number; // When we last synced with server
  isTimeSynced: boolean; // Whether we have a reliable sync
}

class UniversalTimeService {
  private state: TimeSyncState = {
    serverTimeOffset: 0,
    lastSyncTime: 0,
    isTimeSynced: false
  };

  /**
   * Get current universal time in milliseconds (synchronized with server)
   * This replaces all Date.now() calls
   */
  public getUniversalTime(): number {
    const localTime = Date.now();
    
    // Always return local time + offset (offset will be 0 if not synced)
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
    return this.state.isTimeSynced;
  }

  /**
   * Get sync status information
   */
  public getSyncStatus() {
    return {
      isTimeSynced: this.state.isTimeSynced,
      timeDrift: this.state.serverTimeOffset,
      lastSyncTime: this.state.lastSyncTime
    };
  }

  /**
   * Update time offset from Supabase server timestamp
   * This gets called whenever we receive server timestamps from database operations
   */
  public updateFromServerTimestamp(serverTimestamp: string): void {
    try {
      const serverTime = new Date(serverTimestamp).getTime();
      const localTime = Date.now();
      
      if (!isNaN(serverTime) && serverTime > 0) {
        this.state.serverTimeOffset = serverTime - localTime;
        this.state.lastSyncTime = localTime;
        this.state.isTimeSynced = true;
      }
    } catch (error) {
      // If server timestamp is invalid, just use local time
      this.state.serverTimeOffset = 0;
      this.state.isTimeSynced = false;
    }
  }

  /**
   * Manually trigger time synchronization with server (simplified)
   * Now just returns immediately since we rely on database timestamps
   */
  public async syncWithServer(): Promise<void> {
    // No external API calls - we get time from Supabase timestamps
    // This method is kept for compatibility but does nothing
    return Promise.resolve();
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
export const updateTimeFromServer = (timestamp: string): void => universalTimeService.updateFromServerTimestamp(timestamp);
