
interface UseRowStylingProps {
  isDragging: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  isFloating?: boolean;
  isFloated?: boolean;
  color?: string;
  isHeader?: boolean;
}

export const useRowStyling = ({
  isDragging,
  isDraggingMultiple = false,
  isSelected = false,
  isFloating = false,
  isFloated = false,
  color,
  isHeader = false
}: UseRowStylingProps) => {
  let rowClass = '';
  
  if (isDragging) {
    if (isDraggingMultiple && isSelected) {
      rowClass = 'opacity-70';
    } else {
      rowClass = 'opacity-50';
    }
  } else if (isHeader) {
    // Headers: only border and font styling, NO background colors
    rowClass = 'border-l-4 border-gray-400 dark:border-gray-600 font-semibold hover:opacity-90';
  } else if (isFloating || isFloated) {
    // Floating/floated items: only border, NO background colors
    rowClass = 'border-l-4 border-red-600';
  } else {
    // Default rows: only hover effect, NO background colors
    rowClass = 'hover:opacity-90';
  }

  // Add selection ring if selected
  if (isSelected) {
    rowClass += ' ring-2 ring-inset ring-blue-500 border-blue-500';
  }

  return { rowClass };
};
