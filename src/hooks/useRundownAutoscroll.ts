
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
    if (!scrollContainerRef.current || !currentSegmentId || !autoScrollEnabled) {
      return;
    }

    // Don't scroll if we've already scrolled to this segment
    if (lastScrolledSegmentRef.current === currentSegmentId) {
      return;
    }

    try {
      // Look for the target element with data-item-id attribute
      const targetElement = scrollContainerRef.current.querySelector(
        `[data-item-id="${currentSegmentId}"]`
      );

      if (targetElement) {
        // First scroll the element to the top, then adjust with an offset
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
        
        // Add a small delay and then adjust the scroll position to move it down a bit
        setTimeout(() => {
          if (scrollContainerRef.current) {
            const currentScrollTop = scrollContainerRef.current.scrollTop;
            const containerHeight = scrollContainerRef.current.clientHeight;
            // Move it down by about 1/4 of the container height to position it in upper-middle area
            const offset = containerHeight * 0.25;
            
            scrollContainerRef.current.scrollTo({
              top: Math.max(0, currentScrollTop - offset),
              behavior: 'smooth'
            });
          }
        }, 100);
        
        lastScrolledSegmentRef.current = currentSegmentId;
      }
    } catch (error) {
      console.warn('🔄 useRundownAutoscroll: Scroll failed:', error);
    }
  }, [currentSegmentId, autoScrollEnabled]);

  // Scroll when current segment changes and we're playing
  useEffect(() => {
    if (isPlaying && autoScrollEnabled && currentSegmentId) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        scrollToCurrentSegment();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [currentSegmentId, isPlaying, autoScrollEnabled, scrollToCurrentSegment]);

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
