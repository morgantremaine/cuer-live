
import { useEffect, useRef } from 'react';
import { CameraPlotScene } from './useCameraPlotData';

export const useCameraPlotAutoSave = (
  plots: CameraPlotScene[],
  isInitialized: boolean,
  rundownId: string,
  rundownTitle: string,
  readOnly: boolean,
  savedBlueprint: any,
  saveBlueprint: (title: string, lists: any[], showDate?: string, silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => void
) => {
  const lastSaveRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!isInitialized || readOnly || isSavingRef.current) {
      return;
    }

    const currentState = JSON.stringify(plots);
    
    // Only save if the state has actually changed and we have plots
    if (currentState !== lastSaveRef.current && plots.length > 0) {
      lastSaveRef.current = currentState;
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Debounce the save operation
      saveTimeoutRef.current = setTimeout(() => {
        if (!isSavingRef.current) {
          isSavingRef.current = true;
          console.log('Auto-saving camera plots to blueprint:', plots.length);
          
          try {
            // Enhanced save that properly integrates with blueprint persistence
            saveBlueprint(
              rundownTitle,
              savedBlueprint?.lists || [],
              savedBlueprint?.show_date,
              true, // silent save
              savedBlueprint?.notes,
              savedBlueprint?.crew_data,
              plots // Pass the current camera plots
            );
            
            console.log('Camera plots auto-save completed');
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
