
import { useState, useCallback } from 'react';

export interface SearchHighlight {
  itemId: string;
  field: string;
  startIndex: number;
  endIndex: number;
}

export const useSearchHighlight = () => {
  const [currentHighlight, setCurrentHighlight] = useState<SearchHighlight | null>(null);

  const updateHighlight = useCallback((itemId: string, field: string, startIndex: number, endIndex: number) => {
    if (!itemId || !field) {
      setCurrentHighlight(null);
      return;
    }

    setCurrentHighlight({
      itemId,
      field,
      startIndex,
      endIndex
    });
  }, []);

  const clearHighlight = useCallback(() => {
    setCurrentHighlight(null);
  }, []);

  const isHighlighted = useCallback((itemId: string, field: string) => {
    return currentHighlight?.itemId === itemId && currentHighlight?.field === field;
  }, [currentHighlight]);

  const getHighlightForCell = useCallback((itemId: string, field: string) => {
    if (isHighlighted(itemId, field)) {
      return {
        startIndex: currentHighlight!.startIndex,
        endIndex: currentHighlight!.endIndex
      };
    }
    return null;
  }, [currentHighlight, isHighlighted]);

  return {
    currentHighlight,
    updateHighlight,
    clearHighlight,
    isHighlighted,
    getHighlightForCell
  };
};
