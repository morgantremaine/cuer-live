
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
      rowClass = isHeader ? 'bg-[hsl(var(--header-background))] opacity-50' : 'opacity-50';
    }
  } else if (isHeader) {
    rowClass = 'bg-[hsl(var(--header-background))] font-semibold';
  } else if (isFloating || isFloated) {
    // Apply full red background for floated rows
    rowClass = '';
    backgroundColorOverride = '#ef4444'; // Full red background
  } else if (color && color !== '#FFFFFF' && color !== '#ffffff') {
    // For colored rows, no additional styling needed
    rowClass = '';
  } else {
    rowClass = 'bg-background';
  }

  // Selection styling with inset shadow to avoid misalignment
  if (isSelected) {
    if (isHeader) {
      // For headers: use stronger inset shadow and background overlay for visibility
      rowClass += ' ![box-shadow:inset_0_0_0_3px_rgb(59_130_246)] !bg-blue-100/30 dark:!bg-blue-900/30';
    } else {
      // Use inset box-shadow for regular rows to avoid adding outside borders
      rowClass += ' ![box-shadow:inset_0_0_0_2px_rgb(59_130_246)]';
    }
    
    // Add subtle background highlight for non-header, non-colored rows only
    if (!isHeader && (!color || color === '#FFFFFF' || color === '#ffffff') && !isFloating && !isFloated) {
      rowClass += ' !bg-blue-50 dark:!bg-blue-950/20';
    }
  }

  return { rowClass, backgroundColorOverride };
};
