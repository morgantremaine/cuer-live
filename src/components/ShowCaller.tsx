
import React from 'react';
import { useCurrentLiveItem } from '@/hooks/useCurrentLiveItem';
import { RundownItem } from '@/types/rundown';

interface ShowCallerProps {
  findCurrentItem: ((currentTime: Date) => RundownItem | null) | undefined;
  currentTime: Date;
}

const ShowCaller = ({ findCurrentItem, currentTime }: ShowCallerProps) => {
  const currentLiveItem = useCurrentLiveItem(findCurrentItem, currentTime);

  console.log('📺 ShowCaller rendering with live item:', currentLiveItem ? currentLiveItem.name : 'None');

  return (
    <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-2">LIVE NOW</h2>
      {currentLiveItem ? (
        <div>
          <p className="text-lg font-semibold">{currentLiveItem.name}</p>
          <div className="text-sm opacity-90 mt-1">
            <span>{currentLiveItem.startTime} - {currentLiveItem.endTime}</span>
            {currentLiveItem.talent && (
              <span className="ml-4">Talent: {currentLiveItem.talent}</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-lg">No live segment</p>
      )}
    </div>
  );
};

export default ShowCaller;
