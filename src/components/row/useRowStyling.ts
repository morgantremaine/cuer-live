
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
      rowClass = isHeader ? 'bg-blue-100 dark:bg-blue-900 opacity-50' : 'opacity-50';
    }
  } else if (isHeader) {
    // Headers should always be blue
    rowClass = 'bg-blue-600 dark:bg-blue-700 border-l-4 border-blue-800 dark:border-blue-500 font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 text-white';
  } else if (isFloating || isFloated) {
    // Floating/floated items should be red
    rowClass = 'bg-red-800 text-white border-l-4 border-red-600';
  } else if (color && color !== '#ffffff' && color !== '#FFFFFF' && color !== '') {
    // Custom color - let the inline style handle it, just add hover effect
    rowClass = 'hover:opacity-90';
  } else {
    // Default white/gray rows for regular items
    rowClass = 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
  }

  // Add selection ring if selected
  if (isSelected) {
    rowClass += ' ring-2 ring-inset ring-blue-500 border-blue-500';
  }

  return { rowClass };
};
