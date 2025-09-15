
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
        // Check if user is currently scrolling manually by detecting recent scroll events
        const scrollContainer = scrollContainerRef.current;
        const now = Date.now();
        const lastUserScroll = (scrollContainer as any)._lastUserScroll || 0;
        const userScrollingStopped = (scrollContainer as any)._userScrollingStopped || 0;
        const timeSinceLastScroll = now - lastUserScroll;
        const timeSinceScrollingStopped = now - userScrollingStopped;
        
        // If user scrolled recently (within 3 seconds) OR if they're still actively scrolling, skip autoscroll
        // This prevents autoscroll during manual scrolling and for a period after scrolling stops
        if (timeSinceLastScroll < 3000 || timeSinceScrollingStopped < 1000) {
          return;
        }

        // Simple approach: center first, then offset
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        // After scroll starts, schedule a single offset to place at 1/4 down in the scroll viewport
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Find the proper scroll viewport - be more specific for mobile/tablet
            let viewport: HTMLElement | null = null;
            
            // First try to find Radix UI scroll area viewport
            viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
            
            // If not found, try other common viewport selectors
            if (!viewport) {
              viewport = scrollContainer.querySelector('[data-scroll-viewport]') as HTMLElement;
            }
            
            if (!viewport) {
              viewport = scrollContainer.querySelector('.scroll-viewport') as HTMLElement;
            }
            
            // As a last resort, check if scrollContainer itself is the viewport
            // but ONLY if it has overflow properties indicating it's a scroll container
            if (!viewport) {
              const computedStyle = getComputedStyle(scrollContainer);
              const hasOverflow = computedStyle.overflow === 'auto' || 
                                computedStyle.overflow === 'scroll' ||
                                computedStyle.overflowY === 'auto' || 
                                computedStyle.overflowY === 'scroll';
              
              if (hasOverflow) {
                viewport = scrollContainer;
              }
            }
            
            // If we still don't have a proper viewport, abort to prevent scrolling wrong container
            if (!viewport) {
              console.warn('🔄 useRundownAutoscroll: Could not find proper scroll viewport, aborting offset scroll');
              return;
            }

            const viewportRect = viewport.getBoundingClientRect();
            const elementRect = (targetElement as HTMLElement).getBoundingClientRect();

            // Desired position: 1/4 down from the top of the viewport
            const desiredTop = viewportRect.top + (viewportRect.height * 1 / 4);
            const offsetNeeded = elementRect.top - desiredTop;

            if (Math.abs(offsetNeeded) > 4) {
              viewport.scrollBy({ top: offsetNeeded, behavior: 'smooth' });
            }
          });
        });

        lastScrolledSegmentRef.current = currentSegmentId;
      }
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

  // Track manual scrolling to prevent autoscroll interference
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleUserScroll = () => {
      (scrollContainer as any)._lastUserScroll = Date.now();
      
      // Also set a longer timeout to detect when user stops scrolling
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        (scrollContainer as any)._userScrollingStopped = Date.now();
      }, 500); // 500ms after scrolling stops
    };

    // Listen for scroll events to detect manual scrolling
    scrollContainer.addEventListener('scroll', handleUserScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleUserScroll);
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
