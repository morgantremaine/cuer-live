
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
    // Headers: proper theme colors with Tailwind classes
    rowClass = 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-gray-400 dark:border-gray-600 font-semibold hover:opacity-90';
  } else if (isFloating || isFloated) {
    // Floating/floated items: red background with white text
    rowClass = 'bg-red-600 text-white border-l-4 border-red-600';
  } else if (color && color !== '#ffffff' && color !== '#FFFFFF' && color !== '') {
    // Custom color items: use default classes, will be overridden by inline styles
    rowClass = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:opacity-90';
  } else {
    // Default rows: proper theme colors with Tailwind classes
    rowClass = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:opacity-90';
  }

  // Add selection ring if selected
  if (isSelected) {
    rowClass += ' ring-2 ring-inset ring-blue-500 border-blue-500';
  }

  return { rowClass };
};
