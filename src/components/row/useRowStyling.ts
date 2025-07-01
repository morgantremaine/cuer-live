
interface UseRowStylingProps {
  item?: { color?: string; id: string };
  isDragging: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  isFloating?: boolean;
  isFloated?: boolean;
  isCurrentlyPlaying?: boolean;
  color?: string;
  isHeader?: boolean;
  status?: 'upcoming' | 'current' | 'completed';
  selectedRowsCount?: number;
}

export const useRowStyling = ({
  item,
  isDragging,
  isDraggingMultiple = false,
  isSelected = false,
  isFloating = false,
  isFloated = false,
  isCurrentlyPlaying = false,
  color,
  isHeader = false,
  status,
  selectedRowsCount = 1
}: UseRowStylingProps) => {
  // Use color from item if provided, otherwise use the color prop
  const effectiveColor = item?.color || color;
  const effectiveIsFloated = isFloated || (item && 'isFloated' in item && item.isFloated);
  
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
  } else if (isFloating || effectiveIsFloated) {
    // Apply full red background for floated rows
    rowClass = 'border-l-4 border-red-600';
    backgroundColorOverride = '#ef4444'; // Full red background
  } else if (effectiveColor && effectiveColor !== '#FFFFFF' && effectiveColor !== '#ffffff') {
    // For colored rows, no additional styling needed
    rowClass = '';
  } else {
    rowClass = 'bg-background';
  }

  // Simplified selection styling with consistent border approach
  if (isSelected) {
    if (isHeader) {
      // For headers: add blue selection border while preserving left border
      rowClass += ' !border-2 !border-blue-500 !border-l-4 !border-l-blue-500';
    } else if (isFloating || effectiveIsFloated) {
      // For floated rows: add blue selection border while preserving red left border
      rowClass += ' !border-2 !border-blue-500 !border-l-4 !border-l-red-600';
    } else {
      // For regular rows: clean blue border all around with left emphasis
      rowClass += ' !border-2 !border-blue-500 !border-l-4 !border-l-blue-500';
    }
    
    // Add subtle background highlight for non-colored rows only
    if ((!effectiveColor || effectiveColor === '#FFFFFF' || effectiveColor === '#ffffff') && !isFloating && !effectiveIsFloated) {
      rowClass += ' !bg-blue-50 dark:!bg-blue-950/20';
    }
  }

  return { rowClass, backgroundColorOverride };
};
