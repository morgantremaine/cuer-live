
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

  useEffect(() => {
    if (!isInitialized || readOnly || plots.length === 0) {
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
        console.log('Auto-saving camera plots:', plots.length);
        saveBlueprint(
          rundownTitle,
          savedBlueprint?.lists || [],
          savedBlueprint?.show_date,
          true, // silent save
          savedBlueprint?.notes,
          savedBlueprint?.crew_data,
          plots // Pass the camera plots
        );
      }, 1000); // 1 second debounce
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [plots, isInitialized, rundownId, rundownTitle, readOnly, savedBlueprint, saveBlueprint]);
};
