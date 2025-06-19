
import { SearchMatch } from '@/types/search';

export const useSearchNavigation = () => {
  const focusCell = (itemId: string, field: string) => {
    try {
      const cellKey = `${itemId}-${field}`;
      // Try multiple selector strategies for cell focusing
      let cellElement = document.querySelector(`[data-cell-id="${cellKey}"]`) as HTMLInputElement | HTMLTextAreaElement;
      
      if (!cellElement) {
        cellElement = document.querySelector(`[data-cell-ref="${cellKey}"]`) as HTMLInputElement | HTMLTextAreaElement;
      }
      
      if (!cellElement) {
        cellElement = document.querySelector(`[data-cell-key="${cellKey}"]`) as HTMLInputElement | HTMLTextAreaElement;
      }
      
      if (cellElement) {
        cellElement.focus();
        cellElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('🎯 Focused cell:', cellKey);
      } else {
        console.warn('⚠️ Could not find cell element for:', cellKey);
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
    
    console.log('🔍 Navigating to match:', newIndex + 1, 'of', matches.length, match);
    focusCell(match.itemId, match.field);
  };

  return { navigateMatch, focusCell };
};
