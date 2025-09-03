// Conflict detection utilities for preventing overwrites

interface ConflictableData {
  items?: any[];
  title?: string;
  start_time?: string;
  timezone?: string;
  show_date?: string;
  external_notes?: string;
}

/**
 * Detects if there are conflicting changes between local state and remote data
 * Returns true if there's a conflict that should block the save
 */
export const detectDataConflict = (localState: ConflictableData, remoteData: ConflictableData): boolean => {
  // Compare items array changes
  const localItemsSignature = JSON.stringify((localState.items || []).map(item => ({
    id: item.id,
    name: item.name,
    script: item.script,
    notes: item.notes,
    talent: item.talent,
    duration: item.duration
  })));
  
  const remoteItemsSignature = JSON.stringify((remoteData.items || []).map(item => ({
    id: item.id,
    name: item.name,
    script: item.script,
    notes: item.notes,
    talent: item.talent,
    duration: item.duration
  })));

  // Check for significant content changes
  const hasItemConflict = localItemsSignature !== remoteItemsSignature;
  const hasTitleConflict = localState.title !== remoteData.title;
  const hasTimingConflict = localState.start_time !== remoteData.start_time || 
                           localState.timezone !== remoteData.timezone;
  const hasNotesConflict = localState.external_notes !== remoteData.external_notes;

  const conflictDetected = hasItemConflict || hasTitleConflict || hasTimingConflict || hasNotesConflict;
  
  if (conflictDetected) {
    console.warn('🚨 Conflict analysis:', {
      itemConflict: hasItemConflict,
      titleConflict: hasTitleConflict,
      timingConflict: hasTimingConflict,
      notesConflict: hasNotesConflict,
      localItems: localState.items?.length || 0,
      remoteItems: remoteData.items?.length || 0
    });
  }

  return conflictDetected;
};