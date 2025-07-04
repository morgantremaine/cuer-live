
import { useRef, useEffect, useCallback } from 'react';
import { useResponsiveLayout } from '@/hooks/use-mobile';

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
  const { isMobileOrTablet } = useResponsiveLayout();

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
        if (isMobileOrTablet) {
          // On mobile/tablet, calculate header height and scroll with offset
          const headerElement = scrollContainerRef.current.querySelector('.sticky');
          const headerHeight = headerElement ? headerElement.getBoundingClientRect().height : 0;
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = scrollContainerRef.current.getBoundingClientRect();
          const scrollTop = scrollContainerRef.current.scrollTop;
          
          // Calculate target position with header offset
          const targetPosition = scrollTop + (targetRect.top - containerRect.top) - headerHeight - 8; // 8px padding
          
          scrollContainerRef.current.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
          });
        } else {
          // Desktop behavior - center the element
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
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
