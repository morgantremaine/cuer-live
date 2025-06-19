
import { SearchMatch } from '@/types/search';

export const useSearchNavigation = () => {
  const focusCell = (itemId: string, field: string) => {
    console.log('🎯 Attempting to focus cell:', itemId, field);
    
    try {
      const cellKey = `${itemId}-${field}`;
      
      // Try multiple methods to find the cell
      let cellElement = document.querySelector(`[data-cell-key="${cellKey}"]`) as HTMLInputElement | HTMLTextAreaElement;
      
      if (!cellElement) {
        cellElement = document.querySelector(`input[data-item-id="${itemId}"][data-field="${field}"], textarea[data-item-id="${itemId}"][data-field="${field}"]`) as HTMLInputElement | HTMLTextAreaElement;
      }
      
      if (!cellElement) {
        // Try finding by ID if it exists
        cellElement = document.getElementById(cellKey) as HTMLInputElement | HTMLTextAreaElement;
      }
      
      if (cellElement) {
        console.log('✅ Found and focusing cell element');
        cellElement.focus();
        cellElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.log('❌ Could not find cell element for:', cellKey);
      }
    } catch (error) {
      console.log('❌ Error focusing cell:', error);
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

    console.log('🔄 Navigating to match index:', newIndex);
    setCurrentMatchIndex(newIndex);
    
    const match = matches[newIndex];
    focusCell(match.itemId, match.field);
  };

  return { navigateMatch, focusCell };
};
