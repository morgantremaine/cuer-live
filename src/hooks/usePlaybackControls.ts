
import { useState, useRef, useEffect } from 'react';
import { RundownItem } from './useRundownItems';

export const usePlaybackControls = (
  items: RundownItem[],
  updateItem: (id: string, field: string, value: string) => void
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const timeToSeconds = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const clearCurrentStatus = () => {
    items.forEach(item => {
      if (item.status === 'current') {
        updateItem(item.id, 'status', 'upcoming');
      }
    });
  };

  const setCurrentSegment = (segmentId: string) => {
    clearCurrentStatus();
    const segment = items.find(item => item.id === segmentId);
    if (segment && !segment.isHeader) {
      updateItem(segmentId, 'status', 'current');
      setCurrentSegmentId(segmentId);
      const duration = timeToSeconds(segment.duration);
      setTimeRemaining(duration);
    }
  };

  const getNextSegment = (currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex + 1; i < items.length; i++) {
      if (!items[i].isHeader) {
        return items[i];
      }
    }
    return null;
  };

  const getPreviousSegment = (currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!items[i].isHeader) {
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
          // Time's up, move to next segment
          if (currentSegmentId) {
            updateItem(currentSegmentId, 'status', 'completed');
            const nextSegment = getNextSegment(currentSegmentId);
            if (nextSegment) {
              setCurrentSegment(nextSegment.id);
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
