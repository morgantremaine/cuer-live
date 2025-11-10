import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for debounced input handling
 * Provides immediate local state updates for responsive UI while debouncing parent updates
 * Preserves cursor position during active typing to prevent cursor jumping
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
  const cursorPositionRef = useRef<{ start: number; end: number } | null>(null);
  const isTypingRef = useRef(false);
  const elementRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Update local value when prop changes, but only if NOT actively typing
  // This prevents cursor jumps during user input
  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalValue(initialValue);
    }
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
  // Optionally accepts element reference for cursor position preservation
  const onChange = useCallback((value: string, element?: HTMLTextAreaElement | HTMLInputElement) => {
    // Track the element and cursor position if provided
    if (element) {
      elementRef.current = element;
      cursorPositionRef.current = {
        start: element.selectionStart ?? 0,
        end: element.selectionEnd ?? 0
      };
    }
    
    isTypingRef.current = true;
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

  // Restore cursor position after React reconciles the DOM
  useEffect(() => {
    if (isTypingRef.current && elementRef.current && cursorPositionRef.current) {
      const { start, end } = cursorPositionRef.current;
      // Use requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        if (elementRef.current) {
          elementRef.current.setSelectionRange(start, end);
        }
      });
    }
  }, [localValue]);

  // Reset typing flag after user stops typing (300ms allows external updates)
  useEffect(() => {
    if (isTypingRef.current) {
      const timer = setTimeout(() => {
        isTypingRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [localValue]);

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
