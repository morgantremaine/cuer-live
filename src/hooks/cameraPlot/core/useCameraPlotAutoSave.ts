
import { useEffect, useRef, useState } from 'react';
import { CameraPlotScene } from './useCameraPlotData';
import { useBlueprintPartialSave } from '@/hooks/blueprint/useBlueprintPartialSave';

export const useCameraPlotAutoSave = (
  plots: CameraPlotScene[],
  isInitialized: boolean,
  rundownId: string,
  rundownTitle: string,
  readOnly: boolean
) => {
  const lastSaveRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);
  const [savedBlueprint, setSavedBlueprint] = useState<any>(null);

  // Get partial save function for camera plots only
  const { saveCameraPlotsOnly } = useBlueprintPartialSave(
    rundownId,
    rundownTitle,
    '', // showDate not needed for camera plots
    savedBlueprint,
    setSavedBlueprint
  );

  useEffect(() => {
    if (!isInitialized || readOnly || isSavingRef.current) {
      return;
    }

    const currentState = JSON.stringify(plots);
    
    // Only save if the state has actually changed
    if (currentState !== lastSaveRef.current) {
      lastSaveRef.current = currentState;
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Debounce the save operation
      saveTimeoutRef.current = setTimeout(async () => {
        if (!isSavingRef.current) {
          isSavingRef.current = true;
          
          try {
            console.log('📷 Auto-saving camera plots only:', plots.length);
            // Use partial save to only update camera plots
            await saveCameraPlotsOnly(plots);
          } catch (error) {
            console.error('📷 Error auto-saving camera plots:', error);
          } finally {
            isSavingRef.current = false;
          }
        }
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [plots, isInitialized, rundownId, rundownTitle, readOnly, saveCameraPlotsOnly]);
};
