/**
 * Utility for normalizing boolean values from various sources
 * Handles strings, booleans, and other falsy values consistently
 */

export const normalizeBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
};

/**
 * Normalizes float-related boolean fields that can come from different sources
 * Ensures both isFloating and isFloated are kept in sync
 */
export const normalizeFloatFields = (update: { field: string; value: any }) => {
  const isBooleanFloatField = update.field === 'isFloating' || update.field === 'isFloated';
  
  if (isBooleanFloatField) {
    const boolVal = normalizeBoolean(update.value);
    return {
      field: 'isFloating', // Normalize to primary field
      value: boolVal,
      syncFields: { isFloating: boolVal, isFloated: boolVal } // Both fields to sync
    };
  }
  
  return {
    field: update.field,
    value: update.value,
    syncFields: null
  };
};