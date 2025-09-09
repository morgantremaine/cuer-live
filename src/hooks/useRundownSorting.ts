import { useState, useEffect, useMemo } from 'react';
import { SavedRundown } from './useRundownStorage/types';
import { toZonedTime } from 'date-fns-tz';

export type SortOption = 'dateModified' | 'dateCreated' | 'showDate';

export interface SortingState {
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  sortedRundowns: SavedRundown[];
}

const STORAGE_KEY = 'rundown-sort-preference';

export const useRundownSorting = (rundowns: SavedRundown[]): SortingState => {
  // Load saved preference or default to dateModified
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ['dateModified', 'dateCreated', 'showDate'].includes(saved)) {
        return saved as SortOption;
      }
    } catch (error) {
      console.warn('Failed to load sort preference from localStorage:', error);
    }
    return 'dateModified';
  });

  // Save preference to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, sortBy);
    } catch (error) {
      console.warn('Failed to save sort preference to localStorage:', error);
    }
  }, [sortBy]);

  // Sort rundowns based on selected option
  const sortedRundowns = useMemo(() => {
    const sorted = [...rundowns];
    const now = new Date();
    
    switch (sortBy) {
      case 'dateCreated':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      case 'dateModified':
        return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      case 'showDate':
        return sorted.sort((a, b) => {
          const aDate = a.show_date ? new Date(a.show_date) : null;
          const bDate = b.show_date ? new Date(b.show_date) : null;
          
          // Items without show_date go to the end
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          
          // Get current time in each rundown's timezone for proper comparison
          const aTimezone = a.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
          const bTimezone = b.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          // Convert the show dates to their respective timezones for comparison
          const aZonedTime = toZonedTime(aDate, aTimezone);
          const bZonedTime = toZonedTime(bDate, bTimezone);
          
          // Get current time in each timezone for comparison
          const nowInATimezone = toZonedTime(now, aTimezone);
          const nowInBTimezone = toZonedTime(now, bTimezone);
          
          const aTime = aZonedTime.getTime();
          const bTime = bZonedTime.getTime();
          const nowATime = nowInATimezone.getTime();
          const nowBTime = nowInBTimezone.getTime();
          
          // Determine if dates are future or past in their respective timezones
          const aIsFuture = aTime >= nowATime;
          const bIsFuture = bTime >= nowBTime;
          
          // Both dates are in the future - sort by closest to now (earliest future date first)
          if (aIsFuture && bIsFuture) {
            return aTime - bTime;
          }
          
          // Both dates are in the past - sort by most recent past date first
          if (!aIsFuture && !bIsFuture) {
            return bTime - aTime;
          }
          
          // One future, one past - future dates always come first
          if (aIsFuture && !bIsFuture) return -1;
          if (bIsFuture && !aIsFuture) return 1;
          
          return 0;
        });
      
      default:
        return sorted;
    }
  }, [rundowns, sortBy]);

  return {
    sortBy,
    setSortBy,
    sortedRundowns
  };
};