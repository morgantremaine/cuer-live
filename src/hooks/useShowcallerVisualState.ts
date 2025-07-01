
import { useState, useEffect, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerMasterTiming } from './useShowcallerMasterTiming';

interface UseShowcallerVisualStateProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
}

export const useShowcallerVisualState = ({
  items,
  rundownId,
  userId
}: UseShowcallerVisualStateProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [playbackStartTime, setPlaybackStartTime] = useState<number | null>(null);
  const [isController, setIsController] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [visualState, setVisualState] = useState<any>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  const initializationRef = useRef(false);

  // Use master timing for consistent time calculations
  const { timeRemaining, timingStatus } = useShowcallerMasterTiming({
    items,
    rundownStartTime: '00:00:00', // This should come from rundown state
    isPlaying,
    currentSegmentId,
    playbackStartTime
  });

  // Initialize showcaller state
  useEffect(() => {
    if (!initializationRef.current && rundownId) {
      initializationRef.current = true;
      setIsInitialized(true);
      console.log('📺 Showcaller visual state initialized with master timing');
    }
  }, [rundownId]);

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    const targetSegmentId = selectedSegmentId || currentSegmentId;
    if (!targetSegmentId) return;

    console.log('📺 Play called with master timing:', { targetSegmentId });
    
    setCurrentSegmentId(targetSegmentId);
    setPlaybackStartTime(Date.now());
    setIsPlaying(true);
    setIsController(true);
    setLastUpdateTime(new Date().toISOString());
  }, [currentSegmentId]);

  const pause = useCallback(() => {
    console.log('📺 Pause called');
    setIsPlaying(false);
    setLastUpdateTime(new Date().toISOString());
  }, []);

  const forward = useCallback(() => {
    const currentIndex = items.findIndex(item => item.id === currentSegmentId);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < items.length) {
      const nextSegment = items[nextIndex];
      console.log('📺 Forward to:', nextSegment.id);
      
      setCurrentSegmentId(nextSegment.id);
      setPlaybackStartTime(Date.now());
      setLastUpdateTime(new Date().toISOString());
    }
  }, [items, currentSegmentId]);

  const backward = useCallback(() => {
    const currentIndex = items.findIndex(item => item.id === currentSegmentId);
    const prevIndex = currentIndex - 1;
    
    if (prevIndex >= 0) {
      const prevSegment = items[prevIndex];
      console.log('📺 Backward to:', prevSegment.id);
      
      setCurrentSegmentId(prevSegment.id);
      setPlaybackStartTime(Date.now());
      setLastUpdateTime(new Date().toISOString());
    }
  }, [items, currentSegmentId]);

  const reset = useCallback(() => {
    console.log('📺 Reset called');
    setIsPlaying(false);
    setCurrentSegmentId(null);
    setPlaybackStartTime(null);
    setLastUpdateTime(new Date().toISOString());
  }, []);

  const jumpToSegment = useCallback((segmentId: string) => {
    console.log('📺 Jump to segment:', segmentId);
    setCurrentSegmentId(segmentId);
    setPlaybackStartTime(Date.now());
    setLastUpdateTime(new Date().toISOString());
  }, []);

  // Visual status functions
  const getItemVisualStatus = useCallback((itemId: string): 'upcoming' | 'current' | 'completed' => {
    if (itemId === currentSegmentId) {
      return 'current';
    }
    
    const currentIndex = items.findIndex(item => item.id === currentSegmentId);
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (currentIndex === -1 || itemIndex === -1) {
      return 'upcoming';
    }
    
    return itemIndex < currentIndex ? 'completed' : 'upcoming';
  }, [items, currentSegmentId]);

  const setItemVisualStatus = useCallback((itemId: string, status: string) => {
    // Implementation for setting visual status
    console.log('📺 Set visual status:', { itemId, status });
  }, []);

  const clearAllVisualStatuses = useCallback(() => {
    console.log('📺 Clear all visual statuses');
  }, []);

  const applyExternalVisualState = useCallback((externalState: any) => {
    if (!externalState || externalState.lastUpdate === lastUpdateTime) {
      return;
    }

    console.log('📺 Applying external visual state with master timing');
    
    setIsPlaying(externalState.isPlaying || false);
    setCurrentSegmentId(externalState.currentSegmentId || null);
    setPlaybackStartTime(externalState.playbackStartTime || null);
    setIsController(false); // External state means we're not the controller
    setLastUpdateTime(externalState.lastUpdate);
  }, [lastUpdateTime]);

  const trackOwnUpdate = useCallback((timestamp: string) => {
    setLastUpdateTime(timestamp);
  }, []);

  return {
    visualState: {
      isPlaying,
      currentSegmentId,
      timeRemaining,
      timingStatus,
      controllerId: isController ? userId : null,
      lastUpdate: lastUpdateTime
    },
    isPlaying,
    currentSegmentId,
    timeRemaining, // From master timing
    isController,
    isInitialized,
    
    // Control functions
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment,
    
    // Visual state functions
    getItemVisualStatus,
    setItemVisualStatus,
    clearAllVisualStatuses,
    applyExternalVisualState,
    trackOwnUpdate
  };
};
