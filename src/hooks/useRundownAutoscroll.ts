
import { useRef, useEffect, useCallback } from 'react';
import { useIsMobile, useIsTablet } from './use-mobile';
import { rafThrottle } from '@/utils/performanceOptimizations';

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
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  // Include wider tablets in landscape mode
  const isWideTablet = typeof window !== 'undefined' && window.innerWidth < 1280 && window.innerWidth >= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const isMobileOrTablet = isMobile || isTablet || isWideTablet;

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

        // Get the proper viewport container
        const viewport = (scrollContainer.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement)
          || (scrollContainer.querySelector('[data-scroll-viewport]') as HTMLElement)
          || (scrollContainer.querySelector('.scroll-viewport') as HTMLElement)
          || scrollContainer;

        if (isMobileOrTablet) {
          // Mobile-specific scroll: Use manual calculation to stay within container bounds
          const viewportRect = viewport.getBoundingClientRect();
          const elementRect = (targetElement as HTMLElement).getBoundingClientRect();
          
          // Calculate current scroll position
          const currentScrollTop = viewport.scrollTop;
          
          // Calculate where element should be positioned (1/4 down from viewport top)
          const desiredPositionInViewport = viewportRect.height * 0.25;
          
          // Calculate element's current position relative to viewport top
          const elementOffsetFromViewportTop = elementRect.top - viewportRect.top;
          
          // Calculate the scroll adjustment needed
          const scrollAdjustment = elementOffsetFromViewportTop - desiredPositionInViewport;
          const targetScrollTop = currentScrollTop + scrollAdjustment;
          
          // Ensure we don't scroll beyond container bounds
          const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
          const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
          
          // Perform the scroll operation only within the container
          if (Math.abs(finalScrollTop - currentScrollTop) > 4) {
            viewport.scrollTo({ 
              top: finalScrollTop, 
              behavior: 'smooth' 
            });
          }
        } else {
          // Desktop: Use existing scrollIntoView approach
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });

          // After scroll starts, schedule a single offset to place at 1/4 down in the scroll viewport
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
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
        }

        lastScrolledSegmentRef.current = currentSegmentId;
      }
    } catch (error) {
      console.warn('🔄 useRundownAutoscroll: Scroll failed:', error);
    }
  }, [currentSegmentId, autoScrollEnabled, isMobileOrTablet]);

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

  // Track manual scrolling to prevent autoscroll interference with RAF throttling
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

    // Throttle scroll handler with RAF for better performance
    const throttledScrollHandler = rafThrottle(handleUserScroll);

    // Listen for scroll events to detect manual scrolling
    scrollContainer.addEventListener('scroll', throttledScrollHandler, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', throttledScrollHandler);
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
