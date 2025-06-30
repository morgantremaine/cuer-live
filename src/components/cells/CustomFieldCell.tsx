
import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CustomFieldCellProps {
  value: string;
  onChange: (value: string) => void;
  onUserTyping?: (typing: boolean) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}

export const CustomFieldCell = ({
  value,
  onChange,
  onUserTyping,
  placeholder,
  className = '',
  multiline = false
}: CustomFieldCellProps) => {
  const changeTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [localValue, setLocalValue] = useState(value);
  const [isTyping, setIsTyping] = useState(false);

  // Update local value when prop changes
  useEffect(() => {
    if (!isTyping) {
      setLocalValue(value);
    }
  }, [value, isTyping]);

  // Optimized change handler
  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    
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

    // Debounced onChange
    changeTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 250);

    // Typing timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onUserTyping?.(false);
    }, 800);
  }, [onChange, onUserTyping, isTyping]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleChange(e.target.value);
  }, [handleChange]);

  const handleBlur = useCallback(() => {
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (localValue !== value) {
      onChange(localValue);
    }
    
    setIsTyping(false);
    onUserTyping?.(false);
  }, [localValue, value, onChange, onUserTyping]);

  // Cleanup
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

  if (multiline) {
    return (
      <Textarea
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`resize-none transition-none ${className}`}
        style={{ minHeight: '60px', maxHeight: '120px' }}
      />
    );
  }

  return (
    <Input
      value={localValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`transition-none ${className}`}
    />
  );
};
