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
          
          // Get timezones or default to user's timezone
          const aTimezone = a.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
          const bTimezone = b.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          // Get current time in each timezone
          const nowInATimezone = toZonedTime(now, aTimezone);
          const nowInBTimezone = toZonedTime(now, bTimezone);
          
          // Get today's date string in each timezone (YYYY-MM-DD format)
          const todayInA = nowInATimezone.toISOString().split('T')[0];
          const todayInB = nowInBTimezone.toISOString().split('T')[0];
          
          // Compare show dates to today in their respective timezones
          const aIsToday = a.show_date === todayInA;
          const bIsToday = b.show_date === todayInB;
          const aIsFuture = a.show_date > todayInA;
          const bIsFuture = b.show_date > todayInB;
          const aIsPast = a.show_date < todayInA;
          const bIsPast = b.show_date < todayInB;
          
          // Sorting priority: Today first, then future (nearest first), then past (most recent first)
          
          // Both are today - sort by date string
          if (aIsToday && bIsToday) return a.show_date.localeCompare(b.show_date);
          
          // One is today, other is not - today comes first
          if (aIsToday && !bIsToday) return -1;
          if (bIsToday && !aIsToday) return 1;
          
          // Both are future - sort by nearest first
          if (aIsFuture && bIsFuture) return a.show_date.localeCompare(b.show_date);
          
          // Both are past - sort by most recent first
          if (aIsPast && bIsPast) return b.show_date.localeCompare(a.show_date);
          
          // One future, one past - future comes first
          if (aIsFuture && bIsPast) return -1;
          if (bIsFuture && aIsPast) return 1;
          
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