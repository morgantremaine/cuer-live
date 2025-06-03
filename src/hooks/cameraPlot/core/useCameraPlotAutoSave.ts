
import { useEffect, useRef } from 'react';
import { CameraPlotScene } from './useCameraPlotData';

export const useCameraPlotAutoSave = (
  plots: CameraPlotScene[],
  isInitialized: boolean,
  rundownId: string,
  rundownTitle: string,
  readOnly: boolean,
  savedBlueprint: any,
  saveBlueprint: (title: string, lists: any[], showDate?: string, silent?: boolean, notes?: string, crewData?: any, cameraPlots?: CameraPlotScene[]) => Promise<void>
) => {
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedPlotsRef = useRef<string>('');

  useEffect(() => {
    if (readOnly) {
      return;
    }

    if (isInitialized && rundownId && rundownTitle && plots !== null) {
      const currentPlotsString = JSON.stringify(plots);
      
      if (currentPlotsString !== lastSavedPlotsRef.current) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        autoSaveTimeoutRef.current = setTimeout(async () => {
          try {
            lastSavedPlotsRef.current = currentPlotsString;
            await saveBlueprint(
              rundownTitle,
              savedBlueprint?.lists || [],
              savedBlueprint?.show_date,
              true,
              savedBlueprint?.notes,
              savedBlueprint?.crew_data,
              plots
            );
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }, 50);
      }
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [plots, isInitialized, rundownId, rundownTitle, savedBlueprint, saveBlueprint, readOnly]);
};
