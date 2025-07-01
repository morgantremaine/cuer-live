
interface UseRowStylingProps {
  isDragging: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  isFloating?: boolean;
  isFloated?: boolean;
  isCurrentlyPlaying?: boolean;
  color?: string;
  isHeader?: boolean;
  status?: 'upcoming' | 'current' | 'completed';
}

export const useRowStyling = ({
  isDragging,
  isDraggingMultiple = false,
  isSelected = false,
  isFloating = false,
  isFloated = false,
  isCurrentlyPlaying = false,
  color,
  isHeader = false,
  status
}: UseRowStylingProps) => {
  let rowClass = '';
  let backgroundColorOverride: string | undefined = undefined;
  
  if (isDragging) {
    if (isDraggingMultiple && isSelected) {
      rowClass = 'opacity-70';
    } else {
      rowClass = isHeader ? 'bg-muted opacity-50' : 'opacity-50';
    }
  } else if (isHeader) {
    rowClass = 'bg-muted border-l-4 border-border font-semibold';
  } else if (isFloating || isFloated) {
    // Apply full red background for floated rows
    rowClass = 'border-l-4 border-red-600';
    backgroundColorOverride = '#ef4444'; // Full red background
  } else if (color && color !== '#FFFFFF' && color !== '#ffffff') {
    // For colored rows, no additional styling needed
    rowClass = '';
  } else {
    rowClass = 'bg-background';
  }

  // Selection styling - skip for headers
  if (isSelected && !isHeader) {
    if (isFloating || isFloated) {
      // For floated rows: add blue selection border while preserving red left border
      rowClass += ' !border-2 !border-blue-500 !border-l-4 !border-l-red-600';
    } else {
      // For regular rows: clean blue border all around with left emphasis
      rowClass += ' !border-2 !border-blue-500 !border-l-4 !border-l-blue-500';
    }
    
    // Add subtle background highlight for non-colored rows only
    if ((!color || color === '#FFFFFF' || color === '#ffffff') && !isFloating && !isFloated) {
      rowClass += ' !bg-blue-50 dark:!bg-blue-950/20';
    }
  }

  return { rowClass, backgroundColorOverride };
};
