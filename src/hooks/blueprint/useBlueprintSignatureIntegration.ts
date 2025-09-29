import { useMemo } from 'react';
import { createContentSignature } from '@/utils/contentSignature';
import { BlueprintList } from '@/types/blueprint';

interface BlueprintSignatureData {
  lists: BlueprintList[];
  showDate: string;
  notes?: string;
  cameraPlots?: any[];
  componentOrder?: string[];
}

/**
 * Signature integration for Blueprint system to maintain consistency
 * with the main rundown content signature system
 */
export const useBlueprintSignatureIntegration = (data: BlueprintSignatureData) => {
  // Create content signature for blueprints using the same system as rundowns
  const blueprintSignature = useMemo(() => {
    return createContentSignature({
      items: [], // Blueprints don't have rundown items
      title: 'blueprint', // Consistent title for blueprint signatures
      columns: [],
      timezone: '',
      startTime: '',
      showDate: data.showDate ? new Date(data.showDate) : null,
      externalNotes: JSON.stringify({
        lists: data.lists || [],
        notes: data.notes || '',
        cameraPlots: data.cameraPlots || [],
        componentOrder: data.componentOrder || ['crew-list', 'camera-plot', 'scratchpad']
      })
    });
  }, [data.lists, data.showDate, data.notes, data.cameraPlots, data.componentOrder]);

  // Check if current blueprint differs from saved signature
  const hasBlueprintChanges = useMemo(() => {
    return (savedSignature: string | null) => {
      if (!savedSignature) return true;
      return blueprintSignature !== savedSignature;
    };
  }, [blueprintSignature]);

  // Create lightweight blueprint signature for performance
  const lightweightSignature = useMemo(() => {
    const listCount = data.lists?.length || 0;
    const plotCount = data.cameraPlots?.length || 0;
    const notesLength = data.notes?.length || 0;
    
    return JSON.stringify({
      listCount,
      plotCount,
      notesLength,
      showDate: data.showDate,
      componentOrder: data.componentOrder
    });
  }, [data.lists, data.cameraPlots, data.notes, data.showDate, data.componentOrder]);

  return {
    blueprintSignature,
    lightweightSignature,
    hasBlueprintChanges
  };
};