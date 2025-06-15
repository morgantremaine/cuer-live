
import { useCallback } from 'react';
import { useBlueprintPersistence } from './useBlueprintPersistence';
import { BlueprintList } from '@/types/blueprint';

interface PartialSaveOptions {
  lists?: BlueprintList[];
  showDate?: string;
  notes?: string;
  crewData?: any[];
  cameraPlots?: any[];
  componentOrder?: string[];
}

export const useBlueprintPartialSave = (
  rundownId: string,
  rundownTitle: string,
  showDate: string,
  savedBlueprint: any,
  setSavedBlueprint: (blueprint: any) => void
) => {
  const { savePartialBlueprint } = useBlueprintPersistence(
    rundownId,
    rundownTitle,
    showDate,
    savedBlueprint,
    setSavedBlueprint
  );

  const saveListsOnly = useCallback(async (lists: BlueprintList[]) => {
    console.log('📋 PARTIAL SAVE - Lists only:', lists.length);
    await savePartialBlueprint({ lists });
  }, [savePartialBlueprint]);

  const saveNotesOnly = useCallback(async (notes: string) => {
    console.log('📋 PARTIAL SAVE - Notes only:', notes.length, 'characters');
    await savePartialBlueprint({ notes });
  }, [savePartialBlueprint]);

  const saveCrewDataOnly = useCallback(async (crewData: any[]) => {
    console.log('📋 PARTIAL SAVE - Crew data only:', crewData.length);
    await savePartialBlueprint({ crewData });
  }, [savePartialBlueprint]);

  const saveCameraPlotsOnly = useCallback(async (cameraPlots: any[]) => {
    console.log('📋 PARTIAL SAVE - Camera plots only:', cameraPlots.length);
    await savePartialBlueprint({ cameraPlots });
  }, [savePartialBlueprint]);

  const saveComponentOrderOnly = useCallback(async (componentOrder: string[]) => {
    console.log('📋 PARTIAL SAVE - Component order only:', componentOrder);
    await savePartialBlueprint({ componentOrder });
  }, [savePartialBlueprint]);

  const saveShowDateOnly = useCallback(async (showDate: string) => {
    console.log('📋 PARTIAL SAVE - Show date only:', showDate);
    await savePartialBlueprint({ showDate });
  }, [savePartialBlueprint]);

  return {
    saveListsOnly,
    saveNotesOnly,
    saveCrewDataOnly,
    saveCameraPlotsOnly,
    saveComponentOrderOnly,
    saveShowDateOnly,
    savePartialBlueprint
  };
};
