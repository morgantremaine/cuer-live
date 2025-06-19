
import { SearchMatch } from '@/types/search';

export const useSearchNavigation = () => {
  const focusCell = (itemId: string, field: string) => {
    console.log('🎯 Attempting to focus cell:', itemId, field);
    
    try {
      // Use attribute selectors instead of ID selectors to avoid CSS selector issues
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
            console.log('✅ Found cell element with selector:', selector);
            break;
          }
        } catch (error) {
          console.log('❌ Invalid selector:', selector, error);
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
        
        console.log('✅ Successfully focused and scrolled to cell');
      } else {
        console.log('❌ Could not find cell element for:', itemId, field);
        console.log('Available elements with data-item-id:', document.querySelectorAll('[data-item-id]').length);
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

    console.log('🔄 Navigating from index', currentMatchIndex, 'to index:', newIndex);
    setCurrentMatchIndex(newIndex);
    
    const match = matches[newIndex];
    if (match) {
      console.log('🎯 Focusing on match:', match);
      focusCell(match.itemId, match.field);
    }
  };

  return { navigateMatch, focusCell };
};
