
import { useCallback, useRef, useEffect } from 'react';

interface UseDragAutoScrollProps {
  scrollContainerRef: React.RefObject<HTMLElement>;
  isActive: boolean; // Whether dragging is currently happening
}

export const useDragAutoScroll = ({ scrollContainerRef, isActive }: UseDragAutoScrollProps) => {
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback((direction: 'up' | 'down', speed: number) => {
    stopAutoScroll();
    
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Throttle scroll updates to avoid performance issues
    // Increased delay slightly to make scrolling less aggressive during drag
    const scrollDelay = Math.max(20, 120 - speed); // 20ms minimum (50fps), was 16ms/100-speed
    
    autoScrollIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < scrollDelay) return;
      
      lastScrollTimeRef.current = now;
      
      const scrollAmount = Math.max(2, speed / 10); // Minimum 2px scroll
      const currentScrollTop = scrollContainer.scrollTop;
      
      if (direction === 'up') {
        scrollContainer.scrollTop = Math.max(0, currentScrollTop - scrollAmount);
      } else {
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        scrollContainer.scrollTop = Math.min(maxScroll, currentScrollTop + scrollAmount);
      }
    }, scrollDelay);
  }, [scrollContainerRef, stopAutoScroll]);

  const handleDragAutoScroll = useCallback((e: React.DragEvent) => {
    if (!isActive) {
      stopAutoScroll();
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const mouseY = e.clientY;
    
    // Define scroll zones (top and bottom 100px of the container for easier triggering)
    // Increased from 80px to 100px to make it easier to trigger during long drags
    const scrollZone = 100;
    const topZone = rect.top + scrollZone;
    const bottomZone = rect.bottom - scrollZone;
    
    if (mouseY < topZone && mouseY > rect.top) {
      // Mouse is in top scroll zone
      const distanceFromEdge = topZone - mouseY;
      // Reduced max speed to make scrolling more controlled during drag
      const speed = Math.min(60, (distanceFromEdge / scrollZone) * 60);
      startAutoScroll('up', speed);
    } else if (mouseY > bottomZone && mouseY < rect.bottom) {
      // Mouse is in bottom scroll zone
      const distanceFromEdge = mouseY - bottomZone;
      // Reduced max speed to make scrolling more controlled during drag
      const speed = Math.min(60, (distanceFromEdge / scrollZone) * 60);
      startAutoScroll('down', speed);
    } else {
      // Mouse is not in scroll zones
      stopAutoScroll();
    }
  }, [isActive, scrollContainerRef, startAutoScroll, stopAutoScroll]);

  // Stop auto-scroll when dragging becomes inactive
  useEffect(() => {
    if (!isActive) {
      stopAutoScroll();
    }
  }, [isActive, stopAutoScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  return {
    handleDragAutoScroll,
    stopAutoScroll
  };
};
