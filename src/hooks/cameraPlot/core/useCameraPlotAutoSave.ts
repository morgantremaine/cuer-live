
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
    if (!isInitialized || readOnly || plots.length === 0 || isSavingRef.current) {
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
      saveTimeoutRef.current = setTimeout(() => {
        if (!isSavingRef.current) {
          isSavingRef.current = true;
          console.log('Camera plot auto-save: Saving', plots.length, 'camera plots');
          
          try {
            saveBlueprint(
              rundownTitle,
              savedBlueprint?.lists || [],
              savedBlueprint?.show_date,
              true, // silent save
              savedBlueprint?.notes,
              savedBlueprint?.crew_data,
              plots // Pass the camera plots
            );
            console.log('Camera plot auto-save: Save completed successfully');
          } catch (error) {
            console.error('Camera plot auto-save: Error saving camera plots:', error);
          } finally {
            isSavingRef.current = false;
          }
        }
      }, 1000); // Reduced debounce time to 1 second for better responsiveness
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [plots, isInitialized, rundownId, rundownTitle, readOnly, savedBlueprint, saveBlueprint]);
};
