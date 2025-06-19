
import { SearchMatch } from '@/types/search';

export const useSearchNavigation = () => {
  const focusCell = (itemId: string, field: string) => {
    try {
      const cellKey = `${itemId}-${field}`;
      const cellElement = document.querySelector(`[data-cell-key="${cellKey}"]`) as HTMLInputElement | HTMLTextAreaElement;
      if (cellElement) {
        cellElement.focus();
        cellElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      console.log('Could not focus cell:', error);
    }
  };

  const navigateMatch = (
    matches: SearchMatch[],
    currentMatchIndex: number,
    setCurrentMatchIndex: (index: number) => void,
    direction: 'next' | 'prev'
  ) => {
    if (matches.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentMatchIndex < matches.length - 1 ? currentMatchIndex + 1 : 0;
    } else {
      newIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : matches.length - 1;
    }

    setCurrentMatchIndex(newIndex);
    const match = matches[newIndex];
    focusCell(match.itemId, match.field);
  };

  return { navigateMatch };
};
