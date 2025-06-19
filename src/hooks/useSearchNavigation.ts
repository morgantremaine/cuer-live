
import { SearchMatch } from '@/types/search';

export const useSearchNavigation = () => {
  const focusCell = (itemId: string, field: string) => {
    console.log('🎯 Attempting to focus cell:', itemId, field);
    
    try {
      // Try multiple selectors to find the actual cell element
      const selectors = [
        `input[data-item-id="${itemId}"][data-field="${field}"]`,
        `textarea[data-item-id="${itemId}"][data-field="${field}"]`,
        `[data-cell-key="${itemId}-${field}"]`,
        `#${itemId}-${field}`,
        `[data-rundown-cell="${itemId}-${field}"]`
      ];

      let cellElement: HTMLInputElement | HTMLTextAreaElement | null = null;

      for (const selector of selectors) {
        cellElement = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
        if (cellElement) {
          console.log('✅ Found cell element with selector:', selector);
          break;
        }
      }
      
      if (cellElement) {
        cellElement.focus();
        cellElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
        
        // Ensure the cell is visible and focused
        setTimeout(() => {
          if (cellElement) {
            cellElement.focus();
          }
        }, 100);
      } else {
        console.log('❌ Could not find cell element for:', itemId, field);
        console.log('Available elements:', document.querySelectorAll('input, textarea').length);
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
