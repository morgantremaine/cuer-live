
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
        const timeSinceLastScroll = now - lastUserScroll;
        
        // If user scrolled recently (within 2 seconds), skip autoscroll to avoid interference
        if (timeSinceLastScroll < 2000) {
          return;
        }

        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
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

    const handleUserScroll = () => {
      (scrollContainer as any)._lastUserScroll = Date.now();
    };

    // Listen for scroll events to detect manual scrolling
    scrollContainer.addEventListener('scroll', handleUserScroll, { passive: true });
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleUserScroll);
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
