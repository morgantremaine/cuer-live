import { useRef, useCallback } from 'react';
import { normalizeTimestamp } from '@/utils/realtimeUtils';

interface UpdateTrackingEntry {
  timestamp: string;
  type: 'content' | 'showcaller' | 'structural';
  userId: string;
  createdAt: number;
}

interface UseUnifiedUpdateTrackingProps {
  userId: string;
  rundownId: string | null;
  enabled?: boolean;
}

export const useUnifiedUpdateTracking = ({
  userId,
  rundownId,
  enabled = true
}: UseUnifiedUpdateTrackingProps) => {
  const ownUpdatesRef = useRef<Map<string, UpdateTrackingEntry>>(new Map());
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup old entries every 30 seconds
  const scheduleCleanup = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    
    cleanupTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      const entries = ownUpdatesRef.current;
      
      for (const [key, entry] of entries.entries()) {
        // Remove entries older than 60 seconds
        if (now - entry.createdAt > 60000) {
          entries.delete(key);
        }
      }
      
      // Schedule next cleanup if we still have entries
      if (entries.size > 0) {
        scheduleCleanup();
      }
    }, 30000);
  }, []);

  // Track our own update with unified format
  const trackOwnUpdate = useCallback((
    rawTimestamp: string, 
    type: 'content' | 'showcaller' | 'structural' = 'content'
  ) => {
    if (!enabled || !rundownId) return;

    try {
      const normalizedTimestamp = normalizeTimestamp(rawTimestamp);
      const entry: UpdateTrackingEntry = {
        timestamp: normalizedTimestamp,
        type,
        userId,
        createdAt: Date.now()
      };

      ownUpdatesRef.current.set(normalizedTimestamp, entry);
      
      console.log(`🏷️ [Unified] Tracked own ${type} update:`, {
        rundownId,
        timestamp: normalizedTimestamp,
        type,
        userId
      });

      scheduleCleanup();
    } catch (error) {
      console.error('Error tracking own update:', error);
    }
  }, [enabled, rundownId, userId, scheduleCleanup]);

  // Check if an update is our own
  const isOwnUpdate = useCallback((
    rawTimestamp: string, 
    updateUserId?: string
  ): boolean => {
    if (!enabled || !rundownId) return false;

    // First check: is the user ID the same?
    if (updateUserId && updateUserId === userId) {
      return true;
    }

    try {
      const normalizedTimestamp = normalizeTimestamp(rawTimestamp);
      const hasEntry = ownUpdatesRef.current.has(normalizedTimestamp);
      
      if (hasEntry) {
        console.log(`🏷️ [Unified] Detected own update by timestamp:`, {
          timestamp: normalizedTimestamp,
          rundownId
        });
      }
      
      return hasEntry;
    } catch (error) {
      console.error('Error checking own update:', error);
      return false;
    }
  }, [enabled, rundownId, userId]);

  // Get statistics for debugging
  const getTrackingStats = useCallback(() => {
    const entries = Array.from(ownUpdatesRef.current.values());
    const now = Date.now();
    
    return {
      totalTracked: entries.length,
      byType: {
        content: entries.filter(e => e.type === 'content').length,
        showcaller: entries.filter(e => e.type === 'showcaller').length,
        structural: entries.filter(e => e.type === 'structural').length
      },
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.createdAt)) : null,
      averageAge: entries.length > 0 ? 
        entries.reduce((sum, e) => sum + (now - e.createdAt), 0) / entries.length : 0
    };
  }, []);

  // Clear all tracking data (useful for testing/debugging)
  const clearTracking = useCallback(() => {
    ownUpdatesRef.current.clear();
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    console.log(`🏷️ [Unified] Cleared all tracking data for rundown:`, rundownId);
  }, [rundownId]);

  return {
    trackOwnUpdate,
    isOwnUpdate,
    getTrackingStats,
    clearTracking
  };
};