/**
 * FEATURE FLAGS
 * 
 * Controls which collaboration system to use.
 * Set ENABLE_SIMPLE_COLLABORATION to true to use the new simplified system.
 */

export const FEATURE_FLAGS = {
  // Enable simplified collaboration system (removes OCC, LocalShadow, queues)
  ENABLE_SIMPLE_COLLABORATION: false, // Set to true to enable
  
  // Enable periodic checksum/resync as safety net
  ENABLE_PERIODIC_RESYNC: false,
  
  // Log collaboration events for debugging
  DEBUG_COLLABORATION: true
} as const;

// Helper to check if a feature is enabled
export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature];
};