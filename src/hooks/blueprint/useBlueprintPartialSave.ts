import { useCallback } from 'react';
import { useBlueprintPersistence } from './useBlueprintPersistence';
import { BlueprintList } from '@/types/blueprint';
import { TalentPreset } from '@/types/talentPreset';
import { logger } from '@/utils/logger';

interface PartialSaveOptions {
  lists?: BlueprintList[];
  showDate?: string;
  notes?: string;
  cameraPlots?: any[];
  componentOrder?: string[];
  talentPresets?: TalentPreset[];
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
    logger.blueprint('PARTIAL SAVE - Lists only:', { count: lists.length });
    await savePartialBlueprint({ lists });
  }, [savePartialBlueprint]);

  const saveNotesOnly = useCallback(async (notes: string) => {
    logger.blueprint('PARTIAL SAVE - Notes only:', { length: notes.length });
    await savePartialBlueprint({ notes });
  }, [savePartialBlueprint]);

  const saveCameraPlotsOnly = useCallback(async (cameraPlots: any[]) => {
    logger.blueprint('PARTIAL SAVE - Camera plots only:', { count: cameraPlots.length });
    await savePartialBlueprint({ cameraPlots });
  }, [savePartialBlueprint]);

  const saveComponentOrderOnly = useCallback(async (componentOrder: string[]) => {
    logger.blueprint('PARTIAL SAVE - Component order only:', componentOrder);
    await savePartialBlueprint({ componentOrder });
  }, [savePartialBlueprint]);

  const saveShowDateOnly = useCallback(async (showDate: string) => {
    logger.blueprint('PARTIAL SAVE - Show date only:', showDate);
    await savePartialBlueprint({ showDate });
  }, [savePartialBlueprint]);

  const saveTalentPresetsOnly = useCallback(async (talentPresets: TalentPreset[]) => {
    logger.blueprint('PARTIAL SAVE - Talent presets only:', { count: talentPresets.length });
    await savePartialBlueprint({ talentPresets });
  }, [savePartialBlueprint]);

  return {
    saveListsOnly,
    saveNotesOnly,
    saveCameraPlotsOnly,
    saveComponentOrderOnly,
    saveShowDateOnly,
    saveTalentPresetsOnly,
    savePartialBlueprint
  };
};
