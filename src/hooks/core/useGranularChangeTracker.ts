import { useRef, useCallback } from 'react';
import { useUnifiedRealtimeCoordinator } from './useUnifiedRealtimeCoordinator';

export interface FieldChangeEvent {
  itemId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  source: 'user_input' | 'realtime_update' | 'system_update';
}

export const useGranularChangeTracker = (rundownId: string) => {
  const { trackFieldChange } = useUnifiedRealtimeCoordinator(rundownId);
  const activeFieldsRef = useRef<Set<string>>(new Set());
  const fieldValuesRef = useRef<Map<string, any>>(new Map());

  // Track when a user starts editing a field
  const startFieldEdit = useCallback((itemId: string, fieldName: string, currentValue: any) => {
    const fieldKey = `${itemId}:${fieldName}`;
    activeFieldsRef.current.add(fieldKey);
    fieldValuesRef.current.set(fieldKey, currentValue);
    
    console.log(`🎯 Started editing: ${fieldKey}`);
  }, []);

  // Track when a user stops editing a field
  const endFieldEdit = useCallback((itemId: string, fieldName: string, finalValue: any) => {
    const fieldKey = `${itemId}:${fieldName}`;
    const originalValue = fieldValuesRef.current.get(fieldKey);
    
    activeFieldsRef.current.delete(fieldKey);
    fieldValuesRef.current.delete(fieldKey);
    
    // Only track if value actually changed
    if (originalValue !== finalValue) {
      trackFieldChange(itemId, fieldName, originalValue, finalValue);
    }
    
    console.log(`✅ Finished editing: ${fieldKey}`, { originalValue, finalValue });
  }, [trackFieldChange]);

  // Track individual keystrokes for immediate feedback
  const trackKeystroke = useCallback((itemId: string, fieldName: string, newValue: any) => {
    const fieldKey = `${itemId}:${fieldName}`;
    
    // Update the current value but don't trigger save yet
    // This helps with conflict resolution
    fieldValuesRef.current.set(fieldKey, newValue);
    
    // For immediate visual feedback in multi-user scenarios
    // We could broadcast typing indicators here
  }, []);

  // Check if a field is currently being edited
  const isFieldActive = useCallback((itemId: string, fieldName: string): boolean => {
    const fieldKey = `${itemId}:${fieldName}`;
    return activeFieldsRef.current.has(fieldKey);
  }, []);

  // Get current value of a field being edited
  const getFieldValue = useCallback((itemId: string, fieldName: string): any => {
    const fieldKey = `${itemId}:${fieldName}`;
    return fieldValuesRef.current.get(fieldKey);
  }, []);

  // Force save a field (for manual save scenarios)
  const forceSaveField = useCallback((itemId: string, fieldName: string, value: any) => {
    const fieldKey = `${itemId}:${fieldName}`;
    const originalValue = fieldValuesRef.current.get(fieldKey);
    
    trackFieldChange(itemId, fieldName, originalValue || null, value);
  }, [trackFieldChange]);

  return {
    startFieldEdit,
    endFieldEdit,
    trackKeystroke,
    isFieldActive,
    getFieldValue,
    forceSaveField,
    activeFieldCount: activeFieldsRef.current.size
  };
};