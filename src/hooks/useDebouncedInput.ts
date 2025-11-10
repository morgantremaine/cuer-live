import { useState, useEffect, useCallback } from 'react';

/**
 * Phase 1: Input debouncing to prevent parent state updates on every keystroke
 * Maintains local state for immediate UI feedback while batching parent updates
 */
export const useDebouncedInput = (
  initialValue: string,
  onUpdate: (value: string) => void,
  delay: number = 150
) => {
  const [localValue, setLocalValue] = useState(initialValue);

  // Update local state when prop changes (e.g., from external updates)
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  // Debounced update to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== initialValue) {
        onUpdate(localValue);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [localValue, delay, onUpdate, initialValue]);

  // Immediate local update for responsive typing
  const handleChange = useCallback((value: string) => {
    setLocalValue(value);
  }, []);

  return {
    value: localValue,
    onChange: handleChange,
    // Force immediate update (e.g., on blur)
    forceUpdate: useCallback(() => {
      if (localValue !== initialValue) {
        onUpdate(localValue);
      }
    }, [localValue, initialValue, onUpdate])
  };
};
