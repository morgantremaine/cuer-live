interface UseRowStylingProps {
  isDragged: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  isFloating?: boolean;
  isFloated?: boolean;
  isCurrent?: boolean;
  item?: {
    color?: string;
    type?: string;
    isFloated?: boolean;
  };
  rowStatus?: 'upcoming' | 'current' | 'completed' | 'header';
}

export const useRowStyling = ({
  isDragged,
  isDraggingMultiple = false,
  isSelected = false,
  isFloating = false,
  isFloated = false,
  isCurrent = false,
  item,
  rowStatus
}: UseRowStylingProps) => {
  const color = item?.color;
  const isHeader = item?.type === 'header' || rowStatus === 'header';
  const actuallyFloated = isFloated || item?.isFloated || false;
  
  let rowClassName = '';
  let backgroundColor: string | undefined = undefined;
  let textColor: string | undefined = undefined;
  
  if (isDragged) {
    if (isDraggingMultiple && isSelected) {
      rowClassName = 'opacity-70';
    } else {
      rowClassName = isHeader ? 'bg-muted opacity-50' : 'opacity-50';
    }
  } else if (isHeader) {
    rowClassName = 'bg-muted border-l-4 border-border font-semibold hover:bg-muted/80';
  } else if (isFloating || actuallyFloated) {
    // Apply full red background for floated rows
    rowClassName = 'border-l-4 border-red-600';
    backgroundColor = '#ef4444'; // Full red background
    textColor = '#ffffff'; // White text for contrast
  } else if (color && color !== '#FFFFFF' && color !== '#ffffff') {
    // Custom colored rows
    rowClassName = 'hover:opacity-90';
    backgroundColor = color;
    // Determine text color based on background brightness
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    textColor = brightness > 155 ? '#000000' : '#ffffff';
  } else {
    rowClassName = 'bg-background hover:bg-muted/50';
  }

  // Add selection styling with box-shadow for better visibility
  if (isSelected) {
    // Check if row has custom color OR is floated (both need prominent selection styling)
    if ((color && color !== '#FFFFFF' && color !== '#ffffff') || (isFloating || actuallyFloated)) {
      // For colored backgrounds or floated rows, use a prominent box-shadow that creates a thick border
      rowClassName += ' !shadow-[inset_0_0_0_3px_rgb(59_130_246)] !outline !outline-2 !outline-blue-500 !outline-offset-[-2px]';
    } else {
      // Standard ring for non-colored backgrounds
      rowClassName += ' !ring-2 !ring-blue-500 !ring-inset';
    }
    
    if (isHeader) {
      // For headers, only add the ring - don't change background color
      // The header keeps its original bg-muted styling
    } else if ((!color || color === '#FFFFFF' || color === '#ffffff') && !isFloating && !actuallyFloated) {
      // For regular rows without custom colors and not floated, add subtle background highlight
      rowClassName += ' !bg-blue-50 dark:!bg-blue-950/20';
    }
    // For rows with custom colors or floated rows, we rely on the box-shadow and outline to show selection
  }

  return { rowClassName, backgroundColor, textColor };
};
