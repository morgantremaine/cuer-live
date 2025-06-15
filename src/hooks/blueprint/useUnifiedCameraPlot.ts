
import { useMemo } from 'react';
import { useBlueprintContext } from '@/contexts/BlueprintContext';

export const useUnifiedCameraPlot = () => {
  const { state, updateCameraPlots } = useBlueprintContext();

  const scenes = useMemo(() => state.cameraPlots, [state.cameraPlots]);

  const reloadPlots = async () => {
    // The plots are automatically synced through the context
    // This function exists for compatibility but doesn't need to do anything
    console.log('📷 Camera plots are automatically synced');
  };

  return {
    scenes,
    reloadPlots,
    updateCameraPlots,
    isLoading: state.isLoading,
    isSaving: state.isSaving
  };
};
