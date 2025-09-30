/**
 * Per-Cell Save Feature Flag Management
 * Centralizes logic for determining when to use per-cell vs delta save modes
 */

export interface PerCellSaveConfig {
  isEnabled: boolean;
  shouldBypassDocVersion: boolean;
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
      shouldBypassDocVersion: true, // Per-cell saves don't need doc_version conflicts
      shouldSkipRealtimeValidation: false, // Still validate for consistency
      coordinationMode: 'immediate'
    };
  }

  // Default to delta save mode
  return {
    isEnabled: false,
    shouldBypassDocVersion: false,
    shouldSkipRealtimeValidation: false,
    coordinationMode: 'queued'
  };
};

/**
 * Checks if doc_version logic should be bypassed for save operations
 */
export const shouldBypassDocVersion = (rundownData?: { per_cell_save_enabled?: boolean }): boolean => {
  const config = getPerCellSaveConfig(rundownData);
  return config.isEnabled && config.shouldBypassDocVersion;
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
      requiresStructuralCoordination: true, // Still coordinate structural operations
      allowsConcurrentSaves: true
    };
  }
  
  return {
    strategy: 'delta',
    requiresStructuralCoordination: true,
    allowsConcurrentSaves: false
  };
};