
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
    rowClass = 'bg-gray-200 dark:bg-gray-800 border-l-4 border-gray-400 dark:border-gray-600 font-semibold hover:bg-gray-300 dark:hover:bg-gray-700';
  } else if (isFloating || isFloated) {
    rowClass = 'bg-red-800 text-white border-l-4 border-red-600';
  } else if (color && color !== '#FFFFFF') {
    rowClass = 'hover:opacity-90';
  } else {
    rowClass = 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
  }

  if (isSelected) {
    rowClass += ' ring-2 ring-inset ring-blue-500 border-blue-500';
  }

  return { rowClass };
};
