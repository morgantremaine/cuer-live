/**
 * Classification of field types for operation routing
 */

// Text fields that should use debounced operations
export const TEXT_FIELDS = new Set([
  'name',
  'startTime',
  'duration',
  'endTime',
  'elapsedTime',
  'talent',
  'script',
  'gfx',
  'video',
  'images',
  'notes',
  'rowNumber'
]);

// Non-text fields that need immediate operations
export const IMMEDIATE_FIELDS = new Set([
  'color',
  'isFloating',
  'type',
  'status'
]);

/**
 * Check if a field should use debounced text operations
 */
export const isTextField = (field: string): boolean => {
  return TEXT_FIELDS.has(field);
};

/**
 * Check if a field needs immediate operation processing
 */
export const isImmediateField = (field: string): boolean => {
  return IMMEDIATE_FIELDS.has(field);
};
