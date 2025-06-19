
import { SearchMatch } from '@/types/search';

export const useSearchNavigation = () => {
  const focusCell = (itemId: string, field: string) => {
    try {
      // Use the corrected attribute selectors that match the actual DOM attributes
      const selectors = [
        `[data-item-id="${itemId}"][data-field="${field}"]`,
        `[data-cell-key="${itemId}-${field}"]`,
        `[data-rundown-cell="${itemId}-${field}"]`,
        `textarea[data-item-id="${itemId}"][data-field="${field}"]`,
        `input[data-item-id="${itemId}"][data-field="${field}"]`
      ];

      let cellElement: HTMLInputElement | HTMLTextAreaElement | null = null;

      for (const selector of selectors) {
        try {
          cellElement = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
          if (cellElement) {
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (cellElement) {
        cellElement.focus();
        cellElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }
    } catch (error) {
      console.error('Error focusing cell:', error);
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
    if (match) {
      focusCell(match.itemId, match.field);
    }
  };

  return { navigateMatch, focusCell };
};
