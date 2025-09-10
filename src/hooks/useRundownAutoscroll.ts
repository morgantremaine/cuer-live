
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

      console.log('🔄 Autoscroll debug:', {
        currentSegmentId,
        targetElement: !!targetElement,
        autoScrollEnabled,
        scrollContainer: !!scrollContainerRef.current
      });

      if (targetElement) {
        // Check if user is currently scrolling manually by detecting recent scroll events
        const scrollContainer = scrollContainerRef.current;
        const now = Date.now();
        const lastUserScroll = (scrollContainer as any)._lastUserScroll || 0;
        const userScrollingStopped = (scrollContainer as any)._userScrollingStopped || 0;
        const timeSinceLastScroll = now - lastUserScroll;
        const timeSinceScrollingStopped = now - userScrollingStopped;
        
        console.log('🔄 Scroll timing check:', {
          timeSinceLastScroll,
          timeSinceScrollingStopped,
          willSkip: timeSinceLastScroll < 3000 || timeSinceScrollingStopped < 1000
        });
        
        // If user scrolled recently (within 3 seconds) OR if they're still actively scrolling, skip autoscroll
        // This prevents autoscroll during manual scrolling and for a period after scrolling stops
        if (timeSinceLastScroll < 3000 || timeSinceScrollingStopped < 1000) {
          console.log('🔄 Skipping autoscroll - user scrolled recently');
          return;
        }

        // Custom scroll calculation to position element at top third of viewport
        // accounting for zoom scale and sticky header
        let container = scrollContainerRef.current as unknown as HTMLElement;
        const element = targetElement as HTMLElement;

        // Resolve the actual scrollable container by walking up from the element
        let resolvedContainer: HTMLElement | null = null;
        let parent: HTMLElement | null = element.parentElement;
        while (parent && parent !== document.body) {
          const style = window.getComputedStyle(parent);
          const overflowY = style.overflowY;
          const canScroll = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && (parent.scrollHeight > parent.clientHeight + 1);
          if (canScroll) {
            resolvedContainer = parent;
            break;
          }
          parent = parent.parentElement;
        }
        if (resolvedContainer && resolvedContainer !== container) {
          console.log('🔄 Using resolved scroll container', {
            refContainer: {
              className: container.className,
              id: (container as HTMLElement).id,
              scrollHeight: container.scrollHeight,
              clientHeight: container.clientHeight
            },
            resolved: {
              className: resolvedContainer.className,
              id: resolvedContainer.id,
              scrollHeight: resolvedContainer.scrollHeight,
              clientHeight: resolvedContainer.clientHeight
            }
          });
          container = resolvedContainer;
        }

        // Get sticky header height - try multiple selectors
        let headerWrapper = container.querySelector('[data-rundown-table="header"]') as HTMLElement | null;
        if (!headerWrapper) {
          headerWrapper = container.querySelector('.rundown-header') as HTMLElement | null;
        }
        if (!headerWrapper) {
          headerWrapper = container.querySelector('thead') as HTMLElement | null;
        }
        const headerHeight = headerWrapper ? headerWrapper.getBoundingClientRect().height : 0;

        // Detect zoom scale from transform - try multiple selectors
        let zoomContainer = container.querySelector('.zoom-container') as HTMLElement | null;
        if (!zoomContainer) {
          zoomContainer = container.querySelector('[data-zoom-container]') as HTMLElement | null;
        }
        if (!zoomContainer) {
          zoomContainer = container.querySelector('.rundown-body') as HTMLElement | null;
        }
        
        let scaleY = 1;
        if (zoomContainer) {
          const transform = window.getComputedStyle(zoomContainer).transform;
          if (transform && transform !== 'none') {
            const matrix = transform.match(/matrix.*\((.+)\)/);
            if (matrix) {
              const values = matrix[1].split(', ');
              if (values.length >= 4) {
                scaleY = parseFloat(values[3]) || 1; // scaleY is the 4th value in matrix
              }
            }
          }
        }

        console.log('🔄 Autoscroll calculation:', {
          headerHeight,
          scaleY,
          zoomContainer: !!zoomContainer,
          headerWrapper: !!headerWrapper
        });

        // Calculate element position accounting for zoom
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const visualDeltaTop = elementRect.top - containerRect.top;
        const unscaledDeltaTop = visualDeltaTop / scaleY;
        const elementTopUnscaled = container.scrollTop + unscaledDeltaTop;
        const elementCenterUnscaled = elementTopUnscaled + element.offsetHeight / 2;

        // Position at top third of visible content area (below header)
        const anchorPosition = 1 / 3;
        const targetViewportY = headerHeight + (container.clientHeight - headerHeight) * anchorPosition;

        // Calculate desired scroll position for center positioning
        let desiredScrollTop = elementCenterUnscaled - targetViewportY;
        
        // For tall rows, ensure the top is never below the header
        const elementTopPosition = elementTopUnscaled - headerHeight;
        if (desiredScrollTop > elementTopPosition) {
          desiredScrollTop = elementTopPosition;
        }
        const maxScroll = container.scrollHeight - container.clientHeight;
        desiredScrollTop = Math.max(0, Math.min(desiredScrollTop, maxScroll));

        console.log('🔄 Scrolling to position:', {
          elementCenterUnscaled,
          targetViewportY,
          desiredScrollTop,
          currentScrollTop: container.scrollTop
        });

        container.scrollTo({
          top: desiredScrollTop,
          behavior: 'smooth'
        });
        lastScrolledSegmentRef.current = currentSegmentId;
      } else {
        console.warn('🔄 Target element not found for:', currentSegmentId);
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
