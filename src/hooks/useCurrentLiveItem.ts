
import { useState, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';

export const useCurrentLiveItem = (
  findCurrentItem: (currentTime: Date) => RundownItem | null,
  currentTime: Date
) => {
  const [currentLiveItem, setCurrentLiveItem] = useState<RundownItem | null>(null);

  useEffect(() => {
    console.log('🟣 useCurrentLiveItem: Finding current live item at time:', currentTime.toTimeString().substring(0, 8));
    
    const liveItem = findCurrentItem(currentTime);
    
    if (liveItem) {
      console.log('🟣 useCurrentLiveItem: Found live item:', {
        id: liveItem.id,
        name: liveItem.name,
        startTime: liveItem.startTime,
        endTime: liveItem.endTime
      });
    } else {
      console.log('🟣 useCurrentLiveItem: No live item found');
    }
    
    setCurrentLiveItem(liveItem);
  }, [findCurrentItem, currentTime]);

  console.log('🟣 useCurrentLiveItem returning:', currentLiveItem ? currentLiveItem.name : 'null');
  
  return currentLiveItem;
};
