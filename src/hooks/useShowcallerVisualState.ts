
import { useState, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

export interface ShowcallerVisualState {
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: string;
  isController: boolean;
}

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
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [isController, setIsController] = useState(false);
  
  const visualStateRef = useRef<ShowcallerVisualState>({
    currentSegmentId: null,
    isPlaying: false,
    timeRemaining: '00:00:00',
    isController: false
  });

  // Track own updates for realtime sync
  const trackOwnUpdate = useCallback((timestamp: string) => {
    console.log('📺 Tracking own update:', timestamp);
    // This function is used by realtime sync to track updates from this client
  }, []);

  // Jump to a specific segment
  const jumpToSegment = useCallback((segmentId: string) => {
    console.log('🎯 jumpToSegment called with segmentId:', segmentId);
    
    // Find the item to jump to
    const targetItem = items.find(item => item.id === segmentId);
    if (!targetItem) {
      console.warn('Target item not found for segmentId:', segmentId);
      return;
    }
    
    console.log('🎯 Jumping to item:', targetItem.name);
    
    // Update the current segment
    setCurrentSegmentId(segmentId);
    visualStateRef.current.currentSegmentId = segmentId;
    
    // Set as playing to indicate active segment
    setIsPlaying(true);
    visualStateRef.current.isPlaying = true;
    
    // Reset time remaining for the new segment
    setTimeRemaining(targetItem.duration || '00:00:00');
    visualStateRef.current.timeRemaining = targetItem.duration || '00:00:00';
    
    console.log('🎯 Successfully jumped to segment:', segmentId);
  }, [items]);

  // Play/pause controls
  const play = useCallback(() => {
    console.log('▶️ Play called');
    setIsPlaying(true);
    visualStateRef.current.isPlaying = true;
  }, []);

  const pause = useCallback(() => {
    console.log('⏸️ Pause called');
    setIsPlaying(false);
    visualStateRef.current.isPlaying = false;
  }, []);

  const forward = useCallback(() => {
    console.log('⏭️ Forward called');
    if (!currentSegmentId) return;
    
    const currentIndex = items.findIndex(item => item.id === currentSegmentId);
    if (currentIndex >= 0 && currentIndex < items.length - 1) {
      const nextItem = items[currentIndex + 1];
      jumpToSegment(nextItem.id);
    }
  }, [currentSegmentId, items, jumpToSegment]);

  const backward = useCallback(() => {
    console.log('⏮️ Backward called');
    if (!currentSegmentId) return;
    
    const currentIndex = items.findIndex(item => item.id === currentSegmentId);
    if (currentIndex > 0) {
      const previousItem = items[currentIndex - 1];
      jumpToSegment(previousItem.id);
    }
  }, [currentSegmentId, items, jumpToSegment]);

  // Get visual status for an item
  const getItemVisualStatus = useCallback((itemId: string) => {
    if (itemId === currentSegmentId) {
      return isPlaying ? 'current' : 'paused';
    }
    return 'upcoming';
  }, [currentSegmentId, isPlaying]);

  // Apply external visual state from realtime sync
  const applyExternalVisualState = useCallback((newState: ShowcallerVisualState) => {
    console.log('🔄 Applying external visual state:', newState);
    setCurrentSegmentId(newState.currentSegmentId);
    setIsPlaying(newState.isPlaying);
    setTimeRemaining(newState.timeRemaining);
    setIsController(newState.isController);
    
    visualStateRef.current = { ...newState };
  }, []);

  return {
    // State
    currentSegmentId,
    isPlaying,
    timeRemaining,
    isController,
    
    // Actions
    play,
    pause,
    forward,
    backward,
    jumpToSegment,
    
    // Utilities
    getItemVisualStatus,
    applyExternalVisualState,
    trackOwnUpdate,
    
    // For realtime sync
    visualState: visualStateRef.current
  };
};
