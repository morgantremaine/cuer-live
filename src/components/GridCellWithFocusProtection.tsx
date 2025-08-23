import React from 'react';
import { useFieldFocus } from '@/hooks/useFieldFocus';

interface GridCellWithFocusProtectionProps {
  value: string;
  onChange: (value: string) => void;
  rundownId: string | null;
  itemId: string;
  fieldName: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Example grid cell component with focus protection for concurrent editing
 * This automatically tracks when the field is focused/blurred to preserve 
 * user input during concurrent saves
 */
const GridCellWithFocusProtection = ({
  value,
  onChange,
  rundownId,
  itemId,
  fieldName,
  className,
  placeholder,
  disabled
}: GridCellWithFocusProtectionProps) => {
  const { onFieldFocus, onFieldBlur } = useFieldFocus(rundownId, itemId, fieldName);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFieldFocus}
      onBlur={onFieldBlur}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

export default GridCellWithFocusProtection;