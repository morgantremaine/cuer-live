
import React from 'react';
import { useSharedRundownState } from '@/hooks/useSharedRundownState';
import { getVisibleColumns } from '@/utils/sharedRundownUtils';
import SharedRundownHeader from '@/components/shared/SharedRundownHeader';
import SharedRundownTable from '@/components/shared/SharedRundownTable';
import SharedRundownFooter from '@/components/shared/SharedRundownFooter';

const SharedRundown = () => {
  const { rundownData, currentTime, currentSegmentId, loading, error } = useSharedRundownState();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-gray-600">Loading rundown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error loading rundown</div>
          <div className="text-sm text-gray-600">{error}</div>
          <div className="text-xs text-gray-500 mt-4">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (!rundownData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">Rundown not found</div>
          <div className="text-sm text-gray-500">
            This rundown may be private or the link may be incorrect.
          </div>
        </div>
      </div>
    );
  }

  const visibleColumns = getVisibleColumns(rundownData.columns);

  // Determine if showcaller is playing and calculate time remaining
  const showcallerState = rundownData.showcallerState;
  const isPlaying = showcallerState?.isPlaying || false;
  
  // Calculate time remaining for current segment
  let timeRemaining = 0;
  if (currentSegmentId && isPlaying) {
    const currentItem = rundownData.items.find(item => item.id === currentSegmentId);
    if (currentItem && currentItem.duration) {
      // Parse duration (e.g., "02:30" or "02:30:00") and calculate remaining time
      const durationParts = currentItem.duration.split(':').map(Number);
      let totalSeconds = 0;
      
      if (durationParts.length === 2) {
        totalSeconds = durationParts[0] * 60 + durationParts[1];
      } else if (durationParts.length === 3) {
        totalSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
      }
      
      // Calculate elapsed time based on when the segment started
      const segmentStartTime = showcallerState?.segmentStartTime;
      if (segmentStartTime) {
        const elapsed = Math.floor((Date.now() - segmentStartTime) / 1000);
        timeRemaining = Math.max(0, totalSeconds - elapsed);
      } else {
        timeRemaining = totalSeconds;
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="p-4 print:p-2">
        <SharedRundownHeader
          title={rundownData.title}
          currentTime={currentTime}
          startTime={rundownData.startTime || '09:00:00'}
          currentSegmentId={currentSegmentId}
          items={rundownData.items}
          timezone={rundownData.timezone || 'UTC'}
          isPlaying={isPlaying}
          timeRemaining={timeRemaining}
        />

        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <SharedRundownTable
            items={rundownData.items}
            visibleColumns={visibleColumns}
            currentSegmentId={currentSegmentId}
            isPlaying={isPlaying}
          />
        </div>

        <SharedRundownFooter />
      </div>
    </div>
  );
};

export default SharedRundown;
