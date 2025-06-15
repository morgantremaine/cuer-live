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
  
  if (isDragging) {
    if (isDraggingMultiple && isSelected) {
      rowClass = 'opacity-70';
    } else {
      rowClass = isHeader ? 'bg-muted opacity-50' : 'opacity-50';
    }
  } else if (isHeader) {
    rowClass = 'bg-muted border-l-4 border-border font-semibold hover:bg-muted/80';
  } else if (isFloating || isFloated) {
    // Don't add background classes here - they'll be set via style prop
    rowClass = 'border-l-4 border-red-600';
  } else if (color && color !== '#FFFFFF' && color !== '#ffffff') {
    // Don't add background classes here - they'll be set via style prop  
    rowClass = 'hover:opacity-90';
  } else {
    rowClass = 'bg-background hover:bg-muted/50';
  }

  // Add selection styling with ring outline for both headers and regular rows
  if (isSelected) {
    // Use ring outline for selection indication
    rowClass += ' !ring-2 !ring-blue-500 !ring-inset';
    
    if (isHeader) {
      // For headers, only add the ring - don't change background color
      // The header keeps its original bg-muted styling
    } else {
      // For regular rows, add subtle background highlight
      rowClass += ' !bg-blue-50 dark:!bg-blue-950/20';
    }
  }

  return { rowClass };
};
