import { useState, useEffect, useMemo } from 'react';
import { SavedRundown } from './useRundownStorage/types';

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
          
          const aTime = aDate.getTime();
          const bTime = bDate.getTime();
          const nowTime = now.getTime();
          
          // Both dates are in the future - sort by closest to now (earliest future date first)
          if (aTime >= nowTime && bTime >= nowTime) {
            return aTime - bTime;
          }
          
          // Both dates are in the past - sort by most recent past date first
          if (aTime < nowTime && bTime < nowTime) {
            return bTime - aTime;
          }
          
          // One future, one past - future dates always come first
          if (aTime >= nowTime && bTime < nowTime) return -1;
          if (bTime >= nowTime && aTime < nowTime) return 1;
          
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