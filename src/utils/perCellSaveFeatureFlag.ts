/**
 * Per-Cell Save Feature Flag Management
 * Centralizes logic for determining when to use per-cell vs delta save modes
 */

export interface PerCellSaveConfig {
  isEnabled: boolean;
  shouldSkipRealtimeValidation: boolean;
  coordinationMode: 'immediate' | 'queued' | 'disabled';
}

/**
 * Determines if per-cell save should be used for a rundown
 */
export const getPerCellSaveConfig = (rundownData?: {
  per_cell_save_enabled?: boolean;
  team_id?: string;
  user_id?: string;
}): PerCellSaveConfig => {
  // Check explicit rundown setting first
  if (rundownData?.per_cell_save_enabled === true) {
    return {
      isEnabled: true,
      shouldSkipRealtimeValidation: false, // Still validate for consistency
      coordinationMode: 'immediate'
    };
  }

  // Default to delta save mode
  return {
    isEnabled: false,
    shouldSkipRealtimeValidation: false,
    coordinationMode: 'queued'
  };
};

/**
 * Determines coordination strategy for save operations
 */
export const getSaveCoordinationStrategy = (rundownData?: { per_cell_save_enabled?: boolean }): {
  strategy: 'per-cell' | 'delta' | 'hybrid';
  requiresStructuralCoordination: boolean;
  allowsConcurrentSaves: boolean;
} => {
  const config = getPerCellSaveConfig(rundownData);
  
  if (config.isEnabled) {
    return {
      strategy: 'per-cell',
      requiresStructuralCoordination: true,
      allowsConcurrentSaves: true
    };
  }
  
  return {
    strategy: 'delta',
    requiresStructuralCoordination: true,
    allowsConcurrentSaves: true // SIMPLIFIED: Both modes now allow concurrent saves
  };
};