
import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface OptimizedTextAreaCellProps {
  value: string;
  onChange: (value: string) => void;
  onUserTyping?: (typing: boolean) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: number;
  minHeight?: number;
}

export const OptimizedTextAreaCell = ({
  value,
  onChange,
  onUserTyping,
  placeholder,
  className = '',
  maxHeight = 200,
  minHeight = 60
}: OptimizedTextAreaCellProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const changeTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [localValue, setLocalValue] = useState(value);
  const [isTyping, setIsTyping] = useState(false);

  // Update local value when prop changes (from external updates)
  useEffect(() => {
    if (!isTyping) {
      setLocalValue(value);
    }
  }, [value, isTyping]);

  // Optimized height adjustment
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height within bounds
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [maxHeight, minHeight]);

  // Debounced change handler to reduce update frequency
  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    
    // Signal that user is typing
    if (!isTyping) {
      setIsTyping(true);
      onUserTyping?.(true);
    }

    // Clear existing timeouts
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Debounce the onChange call to reduce update frequency
    changeTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300); // 300ms debounce for changes

    // Set typing timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onUserTyping?.(false);
    }, 1000); // 1 second after stopping typing
  }, [onChange, onUserTyping, isTyping]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    handleChange(newValue);
    
    // Adjust height immediately for better UX
    requestAnimationFrame(() => {
      adjustHeight();
    });
  }, [handleChange, adjustHeight]);

  // Handle blur to ensure final value is saved
  const handleBlur = useCallback(() => {
    // Clear timeouts and ensure final save
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Ensure final value is saved
    if (localValue !== value) {
      onChange(localValue);
    }
    
    setIsTyping(false);
    onUserTyping?.(false);
  }, [localValue, value, onChange, onUserTyping]);

  // Initial height adjustment
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Textarea
      ref={textareaRef}
      value={localValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`resize-none overflow-hidden transition-all duration-150 ${className}`}
      style={{
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`,
        height: `${minHeight}px`
      }}
    />
  );
};
