
import { useState, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export const usePlaybackControls = (items: RundownItem[]) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const play = useCallback((selectedSegmentId?: string) => {
    console.log('Playing rundown', selectedSegmentId ? `starting from segment: ${selectedSegmentId}` : '');
    setIsPlaying(true);
    // This would start the actual playback logic
  }, []);

  const pause = useCallback(() => {
    console.log('Pausing rundown');
    setIsPlaying(false);
    // This would pause the actual playback logic
  }, []);

  const forward = useCallback(() => {
    console.log('Moving to next segment');
    // This would move to the next segment
  }, []);

  const backward = useCallback(() => {
    console.log('Moving to previous segment');
    // This would move to the previous segment
  }, []);

  return {
    isPlaying,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  };
};
