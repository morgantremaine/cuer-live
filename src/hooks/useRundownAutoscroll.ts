
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
    console.log('🔄 scrollToCurrentSegment called:', {
      hasContainer: !!scrollContainerRef.current,
      currentSegmentId,
      autoScrollEnabled,
      isPlaying
    });

    if (!scrollContainerRef.current || !currentSegmentId || !autoScrollEnabled) {
      console.log('🔄 Early return - missing requirements');
      return;
    }

    // Don't scroll if we've already scrolled to this segment
    if (lastScrolledSegmentRef.current === currentSegmentId) {
      console.log('🔄 Already scrolled to this segment');
      return;
    }

    try {
      // Look for the target element with data-item-id attribute
      const targetElement = scrollContainerRef.current.querySelector(
        `[data-item-id="${currentSegmentId}"]`
      );

      console.log('🔄 Target element found:', !!targetElement);

      if (targetElement) {
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        
        // Calculate the current scroll position
        const currentScrollTop = container.scrollTop;
        
        // Calculate where the element currently is relative to the container
        const elementTop = elementRect.top - containerRect.top + currentScrollTop;
        
        // Position element at 20% from the top of the viewport for better visibility
        const targetPosition = elementTop - (containerRect.height * 0.2);
        
        console.log('🔄 Scroll calculation:', {
          elementTop,
          containerHeight: containerRect.height,
          targetPosition,
          currentScrollTop
        });

        container.scrollTo({
          top: Math.max(0, targetPosition),
          behavior: 'smooth'
        });
        
        lastScrolledSegmentRef.current = currentSegmentId;
        console.log('🔄 Scrolled to segment:', currentSegmentId);
      } else {
        console.warn('🔄 Target element not found for ID:', currentSegmentId);
        
        // List all elements with data-item-id for debugging
        const allElements = scrollContainerRef.current.querySelectorAll('[data-item-id]');
        console.log('🔄 Available data-item-id elements:', 
          Array.from(allElements).map(el => el.getAttribute('data-item-id'))
        );
      }
    } catch (error) {
      console.warn('🔄 useRundownAutoscroll: Scroll failed:', error);
    }
  }, [currentSegmentId, autoScrollEnabled]);

  // Scroll when current segment changes and we're playing
  useEffect(() => {
    console.log('🔄 useEffect triggered:', {
      isPlaying,
      autoScrollEnabled,
      currentSegmentId
    });

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
      console.log('🔄 Reset scroll tracking - autoscroll disabled');
    }
  }, [autoScrollEnabled]);

  return {
    scrollContainerRef
  };
};
