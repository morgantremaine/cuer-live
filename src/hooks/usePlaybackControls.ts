import { useState, useRef, useEffect } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const usePlaybackControls = (
  items: RundownItem[],
  updateItem: (id: string, field: string, value: string) => void
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Set default current segment to first non-header item (A1) on mount
  useEffect(() => {
    if (!currentSegmentId && items.length > 0) {
      const firstSegment = items.find(item => !isHeaderItem(item));
      if (firstSegment) {
        setCurrentSegmentId(firstSegment.id);
        const duration = timeToSeconds(firstSegment.duration);
        setTimeRemaining(duration);
      }
    }
  }, [items, currentSegmentId]);

  const timeToSeconds = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const clearCurrentStatus = () => {
    items.forEach(item => {
      if (item.status === 'current') {
        updateItem(item.id, 'status', 'completed');
      }
    });
  };

  const setCurrentSegment = (segmentId: string) => {
    clearCurrentStatus();
    const segment = items.find(item => item.id === segmentId);
    if (segment && !isHeaderItem(segment)) {
      updateItem(segmentId, 'status', 'current');
      setCurrentSegmentId(segmentId);
      const duration = timeToSeconds(segment.duration);
      setTimeRemaining(duration);
    }
  };

  const getNextSegment = (currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex + 1; i < items.length; i++) {
      if (!isHeaderItem(items[i])) {
        return items[i];
      }
    }
    return null;
  };

  const getPreviousSegment = (currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!isHeaderItem(items[i])) {
        return items[i];
      }
    }
    return null;
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up, mark current as completed and move to next segment
          if (currentSegmentId) {
            updateItem(currentSegmentId, 'status', 'completed');
            const nextSegment = getNextSegment(currentSegmentId);
            if (nextSegment) {
              setCurrentSegment(nextSegment.id);
              return timeToSeconds(nextSegment.duration);
            } else {
              // No more segments, stop playback
              setIsPlaying(false);
              setCurrentSegmentId(null);
              return 0;
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const play = (selectedSegmentId?: string) => {
    if (selectedSegmentId) {
      // Mark all segments before the selected one as upcoming
      const selectedIndex = items.findIndex(item => item.id === selectedSegmentId);
      items.forEach((item, index) => {
        if (!isHeaderItem(item)) {
          if (index < selectedIndex) {
            updateItem(item.id, 'status', 'upcoming');
          } else if (index > selectedIndex) {
            updateItem(item.id, 'status', 'upcoming');
          }
        }
      });
      setCurrentSegment(selectedSegmentId);
    }
    setIsPlaying(true);
    startTimer();
  };

  const pause = () => {
    setIsPlaying(false);
    stopTimer();
  };

  const forward = () => {
    if (currentSegmentId) {
      const nextSegment = getNextSegment(currentSegmentId);
      if (nextSegment) {
        updateItem(currentSegmentId, 'status', 'completed');
        setCurrentSegment(nextSegment.id);
        if (isPlaying) {
          startTimer();
        }
      }
    }
  };

  const backward = () => {
    if (currentSegmentId) {
      const prevSegment = getPreviousSegment(currentSegmentId);
      if (prevSegment) {
        updateItem(currentSegmentId, 'status', 'upcoming');
        setCurrentSegment(prevSegment.id);
        if (isPlaying) {
          startTimer();
        }
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && currentSegmentId) {
      startTimer();
    } else {
      stopTimer();
    }
    
    return () => stopTimer();
  }, [isPlaying, currentSegmentId]);

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
