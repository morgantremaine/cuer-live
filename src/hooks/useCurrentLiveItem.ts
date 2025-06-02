
import { useState, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';

export const useCurrentLiveItem = (
  findCurrentItem: ((currentTime: Date) => RundownItem | null) | undefined,
  currentTime: Date
) => {
  const [currentLiveItem, setCurrentLiveItem] = useState<RundownItem | null>(null);

  useEffect(() => {
    console.log('🟣 useCurrentLiveItem: Finding current live item at time:', currentTime.toLocaleTimeString());
    
    // Check if findCurrentItem is actually a function
    if (typeof findCurrentItem !== 'function') {
      console.log('🟣 useCurrentLiveItem: findCurrentItem is not a function, returning null');
      setCurrentLiveItem(null);
      return;
    }

    try {
      const liveItem = findCurrentItem(currentTime);
      console.log('🟣 useCurrentLiveItem: Found live item:', liveItem ? liveItem.name : 'None');
      setCurrentLiveItem(liveItem);
    } catch (error) {
      console.error('🟣 useCurrentLiveItem: Error finding current item:', error);
      setCurrentLiveItem(null);
    }
  }, [findCurrentItem, currentTime]);

  console.log('🟣 useCurrentLiveItem returning:', currentLiveItem ? currentLiveItem.name : 'null');
  return currentLiveItem;
};
