
import { useState, useEffect, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  lastUpdate: number;
  controllerId: string | null;
}

interface UseShowcallerStateProps {
  items: RundownItem[];
  updateItem: (id: string, field: string, value: string) => void;
  userId?: string;
  onShowcallerStateChange?: (state: ShowcallerState) => void;
}

export const useShowcallerState = ({
  items,
  updateItem,
  userId,
  onShowcallerStateChange
}: UseShowcallerStateProps) => {
  const [showcallerState, setShowcallerState] = useState<ShowcallerState>({
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    lastUpdate: Date.now(),
    controllerId: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isController = showcallerState.controllerId === userId || !showcallerState.controllerId;

  // Helper function to find current segment index
  const findSegmentIndex = useCallback((segmentId: string | null) => {
    if (!segmentId) return -1;
    return items.findIndex(item => item.id === segmentId && item.type !== 'header');
  }, [items]);

  // Helper function to get next/previous segment
  const getAdjacentSegment = useCallback((direction: 'next' | 'previous') => {
    const currentIndex = findSegmentIndex(showcallerState.currentSegmentId);
    const segments = items.filter(item => item.type !== 'header');
    
    if (direction === 'next') {
      return currentIndex < segments.length - 1 ? segments[currentIndex + 1] : null;
    } else {
      return currentIndex > 0 ? segments[currentIndex - 1] : null;
    }
  }, [items, showcallerState.currentSegmentId, findSegmentIndex]);

  // Timer logic
  useEffect(() => {
    if (showcallerState.isPlaying && showcallerState.currentSegmentId) {
      intervalRef.current = setInterval(() => {
        setShowcallerState(prev => {
          const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
          const newState = {
            ...prev,
            timeRemaining: newTimeRemaining,
            lastUpdate: Date.now()
          };

          // Auto advance when time reaches 0
          if (newTimeRemaining === 0) {
            const nextSegment = getAdjacentSegment('next');
            if (nextSegment) {
              const duration = nextSegment.duration || '00:30';
              const [minutes, seconds] = duration.split(':').map(Number);
              const totalSeconds = (minutes || 0) * 60 + (seconds || 0);
              
              newState.currentSegmentId = nextSegment.id;
              newState.timeRemaining = totalSeconds;
            } else {
              newState.isPlaying = false;
            }
          }

          return newState;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [showcallerState.isPlaying, showcallerState.currentSegmentId, getAdjacentSegment]);

  // Notify about state changes
  useEffect(() => {
    if (onShowcallerStateChange) {
      onShowcallerStateChange(showcallerState);
    }
  }, [showcallerState, onShowcallerStateChange]);

  const play = useCallback((selectedSegmentId?: string) => {
    if (!isController) return;

    setShowcallerState(prev => {
      let segmentId = selectedSegmentId || prev.currentSegmentId;
      let timeRemaining = prev.timeRemaining;

      // If no segment selected, start with first non-header item
      if (!segmentId) {
        const firstSegment = items.find(item => item.type !== 'header');
        if (firstSegment) {
          segmentId = firstSegment.id;
          const duration = firstSegment.duration || '00:30';
          const [minutes, seconds] = duration.split(':').map(Number);
          timeRemaining = (minutes || 0) * 60 + (seconds || 0);
        }
      }

      // If starting a new segment, reset timer
      if (selectedSegmentId && selectedSegmentId !== prev.currentSegmentId) {
        const segment = items.find(item => item.id === selectedSegmentId);
        if (segment) {
          const duration = segment.duration || '00:30';
          const [minutes, seconds] = duration.split(':').map(Number);
          timeRemaining = (minutes || 0) * 60 + (seconds || 0);
        }
      }

      return {
        ...prev,
        isPlaying: true,
        currentSegmentId: segmentId,
        timeRemaining,
        lastUpdate: Date.now(),
        controllerId: userId || prev.controllerId
      };
    });
  }, [items, userId, isController]);

  const pause = useCallback(() => {
    if (!isController) return;
    
    setShowcallerState(prev => ({
      ...prev,
      isPlaying: false,
      lastUpdate: Date.now()
    }));
  }, [isController]);

  const forward = useCallback(() => {
    if (!isController) return;

    const nextSegment = getAdjacentSegment('next');
    if (nextSegment) {
      const duration = nextSegment.duration || '00:30';
      const [minutes, seconds] = duration.split(':').map(Number);
      const totalSeconds = (minutes || 0) * 60 + (seconds || 0);

      setShowcallerState(prev => ({
        ...prev,
        currentSegmentId: nextSegment.id,
        timeRemaining: totalSeconds,
        lastUpdate: Date.now()
      }));
    }
  }, [getAdjacentSegment, isController]);

  const backward = useCallback(() => {
    if (!isController) return;

    const prevSegment = getAdjacentSegment('previous');
    if (prevSegment) {
      const duration = prevSegment.duration || '00:30';
      const [minutes, seconds] = duration.split(':').map(Number);
      const totalSeconds = (minutes || 0) * 60 + (seconds || 0);

      setShowcallerState(prev => ({
        ...prev,
        currentSegmentId: prevSegment.id,
        timeRemaining: totalSeconds,
        lastUpdate: Date.now()
      }));
    }
  }, [getAdjacentSegment, isController]);

  const jumpTo = useCallback((segmentId: string) => {
    if (!isController) return;

    const segment = items.find(item => item.id === segmentId && item.type !== 'header');
    if (segment) {
      const duration = segment.duration || '00:30';
      const [minutes, seconds] = duration.split(':').map(Number);
      const totalSeconds = (minutes || 0) * 60 + (seconds || 0);

      setShowcallerState(prev => ({
        ...prev,
        currentSegmentId: segment.id,
        timeRemaining: totalSeconds,
        lastUpdate: Date.now()
      }));
    }
  }, [items, isController]);

  const applyShowcallerState = useCallback((newState: ShowcallerState) => {
    setShowcallerState(newState);
  }, []);

  return {
    showcallerState,
    isPlaying: showcallerState.isPlaying,
    currentSegmentId: showcallerState.currentSegmentId,
    timeRemaining: showcallerState.timeRemaining,
    isController,
    play,
    pause,
    forward,
    backward,
    jumpTo,
    applyShowcallerState
  };
};
