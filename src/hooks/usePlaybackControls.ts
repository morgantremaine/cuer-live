
import { useState, useCallback, useEffect, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

export const usePlaybackControls = (items: RundownItem[]) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse duration string to seconds
  const parseDuration = (duration: string): number => {
    if (!duration) return 0;
    const parts = duration.split(':');
    if (parts.length === 2) {
      const [minutes, seconds] = parts.map(Number);
      return (minutes * 60) + seconds;
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts.map(Number);
      return (hours * 3600) + (minutes * 60) + seconds;
    }
    return 0;
  };

  // Find current item by ID
  const getCurrentItem = () => {
    return items.find(item => item.id === currentSegmentId);
  };

  // Get current item index
  const getCurrentIndex = () => {
    return items.findIndex(item => item.id === currentSegmentId);
  };

  // Start countdown timer
  const startTimer = useCallback((duration: number) => {
    setTimeRemaining(duration);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-advance to next segment when time runs out
          const currentIndex = getCurrentIndex();
          const nextItem = items[currentIndex + 1];
          
          if (nextItem && nextItem.type === 'regular') {
            setCurrentSegmentId(nextItem.id);
            const nextDuration = parseDuration(nextItem.duration);
            return nextDuration;
          } else {
            // No more items, stop playing
            setIsPlaying(false);
            setCurrentSegmentId(null);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
  }, [items]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const play = useCallback((selectedSegmentId?: string) => {
    let targetId = selectedSegmentId || currentSegmentId;
    
    // If no target specified, start with first regular item
    if (!targetId) {
      const firstRegularItem = items.find(item => item.type === 'regular');
      targetId = firstRegularItem?.id || null;
    }

    if (targetId) {
      const item = items.find(i => i.id === targetId);
      if (item && item.type === 'regular') {
        setCurrentSegmentId(targetId);
        setIsPlaying(true);
        const duration = parseDuration(item.duration);
        startTimer(duration);
        console.log('Playing segment:', item.name, 'Duration:', duration, 'seconds');
      }
    }
  }, [currentSegmentId, items, startTimer]);

  const pause = useCallback(() => {
    console.log('Pausing playback');
    setIsPlaying(false);
    stopTimer();
  }, [stopTimer]);

  const forward = useCallback(() => {
    const currentIndex = getCurrentIndex();
    const nextItem = items[currentIndex + 1];
    
    if (nextItem && nextItem.type === 'regular') {
      setCurrentSegmentId(nextItem.id);
      if (isPlaying) {
        const duration = parseDuration(nextItem.duration);
        startTimer(duration);
      } else {
        setTimeRemaining(parseDuration(nextItem.duration));
      }
      console.log('Moving to next segment:', nextItem.name);
    }
  }, [items, isPlaying, startTimer]);

  const backward = useCallback(() => {
    const currentIndex = getCurrentIndex();
    const prevItem = items[currentIndex - 1];
    
    if (prevItem && prevItem.type === 'regular') {
      setCurrentSegmentId(prevItem.id);
      if (isPlaying) {
        const duration = parseDuration(prevItem.duration);
        startTimer(duration);
      } else {
        setTimeRemaining(parseDuration(prevItem.duration));
      }
      console.log('Moving to previous segment:', prevItem.name);
    }
  }, [items, isPlaying, startTimer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update time remaining when current segment changes (but not playing)
  useEffect(() => {
    if (!isPlaying && currentSegmentId) {
      const item = getCurrentItem();
      if (item) {
        setTimeRemaining(parseDuration(item.duration));
      }
    }
  }, [currentSegmentId, isPlaying]);

  return {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  };
};
