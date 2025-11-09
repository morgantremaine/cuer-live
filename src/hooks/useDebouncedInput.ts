import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for debouncing text input updates to prevent parent re-renders on every keystroke
 * Local state updates immediately (feels responsive), parent updates after delay
 */
export const useDebouncedInput = (
  initialValue: string,
  onUpdate: (value: string) => void,
  delay: number = 150
) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  // Update local value when prop changes (external updates)
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);
  
  const debouncedUpdate = useCallback((value: string) => {
    // Update local state immediately (feels responsive)
    setLocalValue(value);
    
    // Debounce the parent update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onUpdate(value);
    }, delay);
  }, [onUpdate, delay]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return [localValue, debouncedUpdate] as const;
};
