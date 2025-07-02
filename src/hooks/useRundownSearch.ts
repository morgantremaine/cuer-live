
import { useCallback, useState, useRef } from 'react';

export const useRundownSearch = () => {
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleHighlightItem = useCallback((itemId: string) => {
    setHighlightedItemId(itemId);
  }, []);

  const handleScrollToItem = useCallback((itemId: string) => {
    if (!scrollContainerRef.current) return;

    // Find the row element with the matching data-item-id
    const targetElement = scrollContainerRef.current.querySelector(
      `[data-item-id="${itemId}"]`
    );

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedItemId(null);
  }, []);

  return {
    highlightedItemId,
    scrollContainerRef,
    handleHighlightItem,
    handleScrollToItem,
    clearHighlight
  };
};
