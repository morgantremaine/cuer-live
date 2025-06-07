
interface UseRowStylingProps {
  isDragging: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  isFloating?: boolean;
  isFloated?: boolean;
  color?: string;
  isHeader?: boolean;
  isCurrentlyPlaying?: boolean;
}

export const useRowStyling = ({
  isDragging,
  isDraggingMultiple = false,
  isSelected = false,
  isFloating = false,
  isFloated = false,
  color,
  isHeader = false,
  isCurrentlyPlaying = false
}: UseRowStylingProps) => {
  let rowClass = '';
  
  if (isDragging) {
    if (isDraggingMultiple && isSelected) {
      rowClass = 'opacity-70';
    } else {
      rowClass = isHeader ? 'bg-blue-100 dark:bg-blue-900 opacity-50' : 'opacity-50';
    }
  } else if (isCurrentlyPlaying) {
    // Special styling for currently playing row
    rowClass = 'bg-gradient-to-r from-green-50 via-blue-50 to-green-50 dark:from-green-900/30 dark:via-blue-900/30 dark:to-green-900/30 border-l-4 border-green-500 shadow-lg ring-2 ring-green-300 dark:ring-green-700';
  } else if (isHeader) {
    rowClass = 'bg-gray-200 dark:bg-gray-800 border-l-4 border-gray-400 dark:border-gray-600 font-semibold hover:bg-gray-300 dark:hover:bg-gray-700';
  } else if (isFloating || isFloated) {
    rowClass = 'bg-red-800 text-white border-l-4 border-red-600';
  } else if (color && color !== '#FFFFFF') {
    rowClass = 'hover:opacity-90';
  } else {
    rowClass = 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
  }

  if (isSelected && !isCurrentlyPlaying) {
    rowClass += ' ring-2 ring-inset ring-blue-500 border-blue-500';
  }

  return { rowClass };
};
