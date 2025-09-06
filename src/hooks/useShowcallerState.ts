import { useState, useRef, useCallback, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';

// Export ShowcallerState interface for compatibility
export interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  lastUpdate: string;
  controllerId: string | null;
}

export const useShowcallerState = (items: RundownItem[]) => {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoPlayDuration, setAutoPlayDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const operationInProgressRef = useRef(false);
  const { executeWithShowcallerOperation } = useCellUpdateCoordination();

  const currentItem = items[currentItemIndex];

  const reset = useCallback(() => {
    executeWithShowcallerOperation(() => {
      console.log('📺 Showcaller reset operation');
      setCurrentItemIndex(0);
      setIsPlaying(false);
      setCurrentSegmentId(undefined);
      console.log('📺 Reset to start');
    });
  }, [executeWithShowcallerOperation]);

  useEffect(() => {
    if (autoPlayDuration > 0 && isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        if (currentItemIndex < items.length - 1) {
          setCurrentItemIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
          setCurrentItemIndex(0);
        }
      }, autoPlayDuration * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoPlayDuration, isPlaying, currentItemIndex, items.length]);

  // Fix play function to avoid infinite recursion
  useEffect(() => {
    if (!isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, [isPlaying]);

  useEffect(() => {
    if (currentItemIndex >= items.length && items.length > 0) {
      setCurrentItemIndex(items.length - 1);
    }
  }, [currentItemIndex, items.length]);

  const toggleAdvanced = useCallback(() => {
    setShowAdvanced(prev => !prev);
  }, []);

  const forward = useCallback(() => {
    if (currentItemIndex < items.length - 1) {
      executeWithShowcallerOperation(() => {
        console.log('📺 Showcaller forward operation');
        setCurrentItemIndex(prev => {
          const newIndex = prev + 1;
          console.log('📺 Forward to:', newIndex, items[newIndex]?.name);
          return newIndex;
        });
      });
    }
  }, [currentItemIndex, items.length, executeWithShowcallerOperation]);

  const backward = useCallback(() => {
    if (currentItemIndex > 0) {
      executeWithShowcallerOperation(() => {
        console.log('📺 Showcaller backward operation');
        setCurrentItemIndex(prev => {
          const newIndex = prev - 1;
          console.log('📺 Backward to:', newIndex, items[newIndex]?.name);
          return newIndex;
        });
      });
    }
  }, [currentItemIndex, executeWithShowcallerOperation]);

  const play = useCallback((segmentId?: string) => {
    executeWithShowcallerOperation(() => {
      console.log('📺 Showcaller play operation');
      setIsPlaying(true);
      setCurrentSegmentId(segmentId);
      console.log('📺 Play:', segmentId ? `segment ${segmentId}` : 'current item');
    });
  }, [executeWithShowcallerOperation]);

  const pause = useCallback(() => {
    executeWithShowcallerOperation(() => {
      console.log('📺 Showcaller pause operation');
      setIsPlaying(false);
      console.log('📺 Pause');
    });
  }, [executeWithShowcallerOperation]);

  const goToItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      executeWithShowcallerOperation(() => {
        console.log('📺 Showcaller go to item operation');
        setCurrentItemIndex(index);
        console.log('📺 Go to item:', index, items[index]?.name);
      });
    }
  }, [items, executeWithShowcallerOperation]);

  return {
    currentItem,
    currentItemIndex,
    isPlaying,
    currentSegmentId,
    showAdvanced,
    autoPlayDuration,
    setAutoPlayDuration,
    toggleAdvanced,
    forward,
    backward,
    play,
    pause,
    reset,
    goToItem
  };
};