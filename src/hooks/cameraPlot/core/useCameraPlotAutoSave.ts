
import { useEffect, useRef } from 'react';
import { CameraPlotScene } from './useCameraPlotData';

export const useCameraPlotAutoSave = (
  plots: CameraPlotScene[],
  isInitialized: boolean,
  rundownId: string,
  rundownTitle: string,
  readOnly: boolean,
  saveBlueprint: (lists?: any[], silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => void
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
            // Use the unified save function with just camera plots
            saveBlueprint(undefined, true, undefined, undefined, plots);
            console.log('Camera plot auto-save: Save completed successfully');
          } catch (error) {
            console.error('Camera plot auto-save: Error saving camera plots:', error);
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
  }, [plots, isInitialized, rundownId, rundownTitle, readOnly, saveBlueprint]);
};
