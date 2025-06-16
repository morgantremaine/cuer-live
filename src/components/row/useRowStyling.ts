
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
    rowClass = 'bg-muted border-l-4 border-border font-semibold hover:bg-muted/80';
  } else if (isFloating || isFloated) {
    // Apply full red background for floated rows
    rowClass = 'border-l-4 border-red-600';
    backgroundColorOverride = '#ef4444'; // Full red background
  } else if (color && color !== '#FFFFFF' && color !== '#ffffff') {
    // Don't add background classes here - they'll be set via style prop  
    rowClass = 'hover:opacity-90';
  } else {
    rowClass = 'bg-background hover:bg-muted/50';
  }

  // Add selection styling with box-shadow for better visibility
  if (isSelected) {
    if (color && color !== '#FFFFFF' && color !== '#ffffff') {
      // For colored backgrounds, use a prominent box-shadow that creates a thick border
      rowClass += ' !shadow-[inset_0_0_0_3px_rgb(59_130_246)] !outline !outline-2 !outline-blue-500 !outline-offset-[-2px]';
    } else {
      // Standard ring for non-colored backgrounds
      rowClass += ' !ring-2 !ring-blue-500 !ring-inset';
    }
    
    if (isHeader) {
      // For headers, only add the ring - don't change background color
      // The header keeps its original bg-muted styling
    } else if (!color || color === '#FFFFFF' || color === '#ffffff') {
      // For regular rows without custom colors, add subtle background highlight
      rowClass += ' !bg-blue-50 dark:!bg-blue-950/20';
    }
    // For rows with custom colors, we rely on the box-shadow and outline to show selection
  }

  return { rowClass, backgroundColorOverride };
};
