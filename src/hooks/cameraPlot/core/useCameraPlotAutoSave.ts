
import { useEffect, useRef, useState } from 'react';
import { CameraPlotScene } from './useCameraPlotData';
import { useBlueprintPersistence } from '@/hooks/blueprint/useBlueprintPersistence';

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

  // Get blueprint persistence functions
  const { loadBlueprint, saveBlueprint } = useBlueprintPersistence(
    rundownId,
    rundownTitle,
    '', // showDate not needed for camera plots
    savedBlueprint,
    setSavedBlueprint
  );

  // Load existing blueprint data on initialization
  useEffect(() => {
    if (rundownId && !savedBlueprint) {
      loadBlueprint();
    }
  }, [rundownId, loadBlueprint, savedBlueprint]);

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
            // Use correct parameter order for saveBlueprint
            await saveBlueprint(
              savedBlueprint?.lists || [], // updatedLists
              true, // silent save
              savedBlueprint?.show_date || null, // showDateOverride
              savedBlueprint?.notes, // notes
              savedBlueprint?.crew_data, // crewData
              plots // cameraPlots
            );
          } catch (error) {
            console.error('Error auto-saving camera plots:', error);
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
  }, [plots, isInitialized, rundownId, rundownTitle, readOnly, savedBlueprint, saveBlueprint]);
};
