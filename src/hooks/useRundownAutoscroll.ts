
import { useRef, useEffect, useCallback } from 'react';

interface UseRundownAutoscrollProps {
  currentSegmentId: string | null;
  isPlaying: boolean;
  autoScrollEnabled: boolean;
  items: any[];
}

export const useRundownAutoscroll = ({
  currentSegmentId,
  isPlaying,
  autoScrollEnabled,
  items
}: UseRundownAutoscrollProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrolledSegmentRef = useRef<string | null>(null);

  const scrollToCurrentSegment = useCallback(() => {
    if (!currentSegmentId || !autoScrollEnabled) {
      return;
    }

    // Don't scroll if we've already scrolled to this segment
    if (lastScrolledSegmentRef.current === currentSegmentId) {
      return;
    }

    try {
      // Find the specific table scroll container - this is our new target
      const tableScrollContainer = document.querySelector('[data-rundown-table="true"] [data-radix-scroll-area-viewport]') as HTMLElement;
      if (!tableScrollContainer) {
        return;
      }

      // Look for the target element with data-item-id attribute
      const targetElement = document.querySelector(`[data-item-id="${currentSegmentId}"]`) as HTMLElement;
      if (!targetElement) {
        return;
      }

      // Check if user is currently scrolling manually by detecting recent scroll events
      const now = Date.now();
      const lastUserScroll = (tableScrollContainer as any)._lastUserScroll || 0;
      const userScrollingStopped = (tableScrollContainer as any)._userScrollingStopped || 0;
      const timeSinceLastScroll = now - lastUserScroll;
      const timeSinceScrollingStopped = now - userScrollingStopped;
      
      // If user scrolled recently (within 3 seconds) OR if they're still actively scrolling, skip autoscroll
      // This prevents autoscroll during manual scrolling and for a period after scrolling stops
      if (timeSinceLastScroll < 3000 || timeSinceScrollingStopped < 1000) {
        return;
      }

      // Calculate the position relative to the table scroll container
      const elementRect = targetElement.getBoundingClientRect();
      const containerRect = tableScrollContainer.getBoundingClientRect();
      const scrollTop = elementRect.top - containerRect.top + tableScrollContainer.scrollTop;

      // Position element at 1/4 down from top of the table scroll container
      const targetPosition = scrollTop - (tableScrollContainer.clientHeight * 1 / 4);
      const finalScrollTop = Math.max(0, targetPosition);

      tableScrollContainer.scrollTo({
        top: finalScrollTop,
        behavior: 'smooth'
      });

      lastScrolledSegmentRef.current = currentSegmentId;
    } catch (error) {
      console.warn('🔄 useRundownAutoscroll: Scroll failed:', error);
    }
  }, [currentSegmentId, autoScrollEnabled]);

  // Scroll when current segment changes - now works regardless of playing state
  useEffect(() => {
    if (autoScrollEnabled && currentSegmentId) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        scrollToCurrentSegment();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [currentSegmentId, autoScrollEnabled, scrollToCurrentSegment]);

  // Track manual scrolling on the table container to prevent autoscroll interference
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleUserScroll = () => {
      const tableScrollContainer = document.querySelector('[data-rundown-table="true"] [data-radix-scroll-area-viewport]') as HTMLElement;
      if (!tableScrollContainer) return;

      (tableScrollContainer as any)._lastUserScroll = Date.now();
      
      // Also set a longer timeout to detect when user stops scrolling
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        (tableScrollContainer as any)._userScrollingStopped = Date.now();
      }, 500); // 500ms after scrolling stops
    };

    // Find the specific table scroll container and listen for scroll events
    const tableScrollContainer = document.querySelector('[data-rundown-table="true"] [data-radix-scroll-area-viewport]') as HTMLElement;
    if (!tableScrollContainer) return;

    tableScrollContainer.addEventListener('scroll', handleUserScroll, { passive: true });
    
    return () => {
      tableScrollContainer.removeEventListener('scroll', handleUserScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Reset scroll tracking when autoscroll is disabled
  useEffect(() => {
    if (!autoScrollEnabled) {
      lastScrolledSegmentRef.current = null;
    }
  }, [autoScrollEnabled]);

  return {
    scrollContainerRef
  };
};
