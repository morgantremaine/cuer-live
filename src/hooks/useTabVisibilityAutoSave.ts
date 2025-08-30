import { useEffect, useRef } from 'react';
import { RundownState } from './useRundownState';
import { debugLogger } from '@/utils/debugLogger';

interface UseTabVisibilityAutoSaveProps {
  state: RundownState;
  rundownId: string | null;
  performSave: () => Promise<void>;
  createContentSignature: () => string;
  lastSavedRef: React.MutableRefObject<string>;
  isDemo: boolean;
}

export const useTabVisibilityAutoSave = ({
  state,
  rundownId,
  performSave,
  createContentSignature,
  lastSavedRef,
  isDemo
}: UseTabVisibilityAutoSaveProps) => {
  const isHiddenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        isHiddenRef.current = true;
        
        // Skip if demo rundown
        if (isDemo || !rundownId) return;
        
        // Check if there are unsaved changes before tab hide
        const currentSignature = createContentSignature();
        if (currentSignature !== lastSavedRef.current && state.hasUnsavedChanges) {
          debugLogger.autosave('Tab hidden with unsaved changes - triggering immediate save');
          try {
            await performSave();
          } catch (error) {
            console.error('Failed to save on tab hide:', error);
          }
        }
      } else {
        isHiddenRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.hasUnsavedChanges, rundownId, performSave, createContentSignature, lastSavedRef, isDemo]);

  return {
    isHidden: isHiddenRef.current
  };
};