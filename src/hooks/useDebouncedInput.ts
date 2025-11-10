import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for debounced input handling
 * Provides immediate local state updates for responsive UI while debouncing parent updates
 * 
 * @param initialValue - The initial value for the input
 * @param onUpdate - Callback to update parent state (debounced)
 * @param delay - Debounce delay in milliseconds (default: 150ms)
 */
export const useDebouncedInput = (
  initialValue: string,
  onUpdate: (value: string) => void,
  delay: number = 150
) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local value when prop changes (e.g., from external updates)
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  // Debounced update to parent
  const debouncedUpdate = useCallback((value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onUpdate(value);
    }, delay);
  }, [onUpdate, delay]);

  // Handle change - update local state immediately and schedule parent update
  const onChange = useCallback((value: string) => {
    setLocalValue(value);
    debouncedUpdate(value);
  }, [debouncedUpdate]);

  // Force immediate update (useful for blur events)
  const forceUpdate = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onUpdate(localValue);
  }, [localValue, onUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    value: localValue,
    onChange,
    forceUpdate
  };
};
