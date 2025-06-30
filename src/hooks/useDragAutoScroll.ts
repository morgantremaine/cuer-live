
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
    const scrollDelay = Math.max(16, 100 - speed); // 16ms minimum (60fps), faster for higher speed
    
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
    
    // Define scroll zones (top and bottom 80px of the container)
    const scrollZone = 80;
    const topZone = rect.top + scrollZone;
    const bottomZone = rect.bottom - scrollZone;
    
    if (mouseY < topZone && mouseY > rect.top) {
      // Mouse is in top scroll zone
      const distanceFromEdge = topZone - mouseY;
      const speed = Math.min(100, (distanceFromEdge / scrollZone) * 100);
      startAutoScroll('up', speed);
    } else if (mouseY > bottomZone && mouseY < rect.bottom) {
      // Mouse is in bottom scroll zone
      const distanceFromEdge = mouseY - bottomZone;
      const speed = Math.min(100, (distanceFromEdge / scrollZone) * 100);
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
