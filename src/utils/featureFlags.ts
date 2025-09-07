// Feature flags for gradual rollout of new features

export const FEATURE_FLAGS = {
  // Simplified synchronization system
  SIMPLIFIED_SYNC: true, // Set to true to enable new simplified sync system
  
  // Enhanced sync diagnostics
  SYNC_DIAGNOSTICS: true, // Enable sync health monitoring
  
  // Performance monitoring
  PERFORMANCE_MONITORING: true
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};

export const enableFeature = (flag: FeatureFlag): void => {
  (FEATURE_FLAGS as any)[flag] = true;
  console.log(`🚩 Feature enabled: ${flag}`);
};

export const disableFeature = (flag: FeatureFlag): void => {
  (FEATURE_FLAGS as any)[flag] = false;
  console.log(`🚩 Feature disabled: ${flag}`);
};

// Temporary function for testing the simplified sync
export const enableSimplifiedSync = () => {
  enableFeature('SIMPLIFIED_SYNC');
};

// Diagnostic logging for feature usage
export const logFeatureUsage = (flag: FeatureFlag, action: string) => {
  if (FEATURE_FLAGS.SYNC_DIAGNOSTICS) {
    console.log(`📊 Feature usage: ${flag} -> ${action}`);
  }
};