
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

  // Enhanced debugging
  console.log('🔄 useRundownAutoscroll: Hook state:', {
    currentSegmentId,
    isPlaying,
    autoScrollEnabled,
    itemCount: items.length,
    lastScrolledSegment: lastScrolledSegmentRef.current,
    hasScrollContainer: !!scrollContainerRef.current
  });

  const scrollToCurrentSegment = useCallback(() => {
    console.log('🔄 useRundownAutoscroll: scrollToCurrentSegment called', {
      hasScrollContainer: !!scrollContainerRef.current,
      currentSegmentId,
      autoScrollEnabled,
      lastScrolledSegment: lastScrolledSegmentRef.current
    });

    if (!scrollContainerRef.current || !currentSegmentId || !autoScrollEnabled) {
      console.log('🔄 useRundownAutoscroll: Early return - missing requirements');
      return;
    }

    // Don't scroll if we've already scrolled to this segment
    if (lastScrolledSegmentRef.current === currentSegmentId) {
      console.log('🔄 useRundownAutoscroll: Already scrolled to this segment');
      return;
    }

    try {
      // Look for the target element with data-item-id attribute
      const targetElement = scrollContainerRef.current.querySelector(
        `[data-item-id="${currentSegmentId}"]`
      );

      console.log('🔄 useRundownAutoscroll: Target element search:', {
        targetElement: !!targetElement,
        selector: `[data-item-id="${currentSegmentId}"]`,
        allItemElements: scrollContainerRef.current.querySelectorAll('[data-item-id]').length
      });

      if (targetElement) {
        console.log('🔄 useRundownAutoscroll: Scrolling to element at 1/4 from top');
        
        // Get container and element dimensions
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        
        // Calculate the desired position (1/4 from top of container)
        const quarterFromTop = containerRect.height * 0.25;
        
        // Calculate current element position relative to container
        const currentElementTop = elementRect.top - containerRect.top + scrollContainerRef.current.scrollTop;
        
        // Calculate the scroll position needed to place element at 1/4 from top
        const targetScrollTop = currentElementTop - quarterFromTop;
        
        // Smooth scroll to the calculated position
        scrollContainerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
        
        lastScrolledSegmentRef.current = currentSegmentId;
        console.log('🔄 useRundownAutoscroll: Scroll completed to 1/4 position');
      } else {
        console.warn('🔄 useRundownAutoscroll: Target element not found');
        // List all available data-item-id elements for debugging
        const allItems = scrollContainerRef.current.querySelectorAll('[data-item-id]');
        console.log('🔄 useRundownAutoscroll: Available item IDs:', 
          Array.from(allItems).map(el => el.getAttribute('data-item-id'))
        );
      }
    } catch (error) {
      console.warn('🔄 useRundownAutoscroll: Scroll failed:', error);
    }
  }, [currentSegmentId, autoScrollEnabled]);

  // Scroll when current segment changes and we're playing
  useEffect(() => {
    console.log('🔄 useRundownAutoscroll: Effect triggered', {
      isPlaying,
      autoScrollEnabled,
      currentSegmentId,
      shouldScroll: isPlaying && autoScrollEnabled && currentSegmentId
    });

    if (isPlaying && autoScrollEnabled && currentSegmentId) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        console.log('🔄 useRundownAutoscroll: Calling scrollToCurrentSegment after delay');
        scrollToCurrentSegment();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [currentSegmentId, isPlaying, autoScrollEnabled, scrollToCurrentSegment]);

  // Reset scroll tracking when autoscroll is disabled
  useEffect(() => {
    if (!autoScrollEnabled) {
      console.log('🔄 useRundownAutoscroll: Resetting scroll tracking (autoscroll disabled)');
      lastScrolledSegmentRef.current = null;
    }
  }, [autoScrollEnabled]);

  return {
    scrollContainerRef
  };
};
