/**
 * Bulletproof Teleprompter - Enhanced coordination with LocalShadow protection
 * Ensures teleprompter sync never interferes with active editing
 */

import { useCallback, useRef, useEffect } from 'react';
import { useUnifiedSaveCoordination } from './useUnifiedSaveCoordination';
import { localShadowStore } from '@/state/localShadows';
import { getMobileOptimizedDelays } from '@/utils/realtimeUtils';

interface TeleprompterState {
  currentSegmentId: string | null;
  isPlaying: boolean;
  visualState: Record<string, any>;
}

export const useBulletproofTeleprompter = (
  rundownId: string,
  onStateUpdate?: (state: TeleprompterState) => void
) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const { coordinateTeleprompterSave } = useUnifiedSaveCoordination();
  
  // Get mobile-optimized delays
  const delays = getMobileOptimizedDelays();

  // Bulletproof save with LocalShadow protection
  const saveTeleprompterState = useCallback(async (state: TeleprompterState) => {
    if (isSavingRef.current) {
      console.log('📺 Teleprompter: Save already in progress, skipping');
      return;
    }

    const stateString = JSON.stringify(state);
    
    // Skip if no changes
    if (stateString === lastSaveRef.current) {
      return;
    }

    // Check if any teleprompter-related fields are actively being edited
    const activeShadows = localShadowStore.getActiveShadows();
    const hasTeleprompterConflict = Array.from(activeShadows.items.keys()).some(itemId => {
      const itemShadows = activeShadows.items.get(itemId);
      return itemShadows && Object.keys(itemShadows).some(field => 
        ['name', 'script', 'duration'].includes(field)
      );
    });

    if (hasTeleprompterConflict) {
      console.log('🛡️ Teleprompter: Delaying save - fields actively being edited');
      
      // Schedule retry after typing activity settles
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveTeleprompterState(state);
      }, delays.typingProtection);
      
      return;
    }

    isSavingRef.current = true;
    lastSaveRef.current = stateString;

    try {
      console.log('📺 Bulletproof teleprompter save starting:', {
        segmentId: state.currentSegmentId,
        isPlaying: state.isPlaying,
        hasVisualState: Object.keys(state.visualState).length > 0
      });

      await coordinateTeleprompterSave(async () => {
        // Prepare teleprompter state update with protection
        const updateData = {
          showcaller_state: {
            ...state.visualState,
            currentSegmentId: state.currentSegmentId,
            isPlaying: state.isPlaying,
            lastUpdate: new Date().toISOString(),
            source: 'teleprompter'
          }
        };

        // Apply any active shadows to prevent conflicts
        const protectedData = localShadowStore.applyShadowsToData(updateData);
        
        return protectedData;
      });

      console.log('✅ Bulletproof teleprompter save completed');
      
    } catch (error) {
      console.error('❌ Bulletproof teleprompter save failed:', error);
      
      // Reset save state so it can be retried
      isSavingRef.current = false;
      lastSaveRef.current = '';
      
      // Schedule retry with exponential backoff
      const retryDelay = Math.min(delays.saveDebounce * 2, 5000);
      setTimeout(() => {
        saveTeleprompterState(state);
      }, retryDelay);
      
    } finally {
      isSavingRef.current = false;
    }
  }, [rundownId, coordinateTeleprompterSave, delays]);

  // Debounced save for performance
  const debouncedSave = useCallback((state: TeleprompterState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveTeleprompterState(state);
    }, delays.saveDebounce * 0.8); // Slightly faster for teleprompter
  }, [saveTeleprompterState, delays]);

  // Immediate save for critical state changes (play/pause)
  const immediatelyave = useCallback((state: TeleprompterState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTeleprompterState(state);
  }, [saveTeleprompterState]);

  // Update teleprompter state with conflict protection
  const updateTeleprompterState = useCallback((updates: Partial<TeleprompterState>, immediate: boolean = false) => {
    // Create new state
    const newState: TeleprompterState = {
      currentSegmentId: updates.currentSegmentId ?? null,
      isPlaying: updates.isPlaying ?? false,
      visualState: updates.visualState ?? {}
    };

    // Notify callback
    if (onStateUpdate) {
      onStateUpdate(newState);
    }

    // Save with appropriate timing
    if (immediate) {
      immediatelyave(newState);
    } else {
      debouncedSave(newState);
    }
    
    console.log('📺 Teleprompter state updated:', {
      segmentId: newState.currentSegmentId,
      isPlaying: newState.isPlaying,
      immediate
    });
  }, [onStateUpdate, immediatelyave, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    updateTeleprompterState,
    saveTeleprompterState: immediatelyave,
    isSaving: isSavingRef.current
  };
};