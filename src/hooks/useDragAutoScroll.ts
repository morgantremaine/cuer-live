
import { useCallback, useRef, useEffect } from 'react';

interface UseDragAutoScrollProps {
  scrollContainerRef: React.RefObject<HTMLElement>;
  isActive: boolean; // Whether dragging is currently happening
}

export const useDragAutoScroll = ({ scrollContainerRef, isActive }: UseDragAutoScrollProps) => {
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const accelerationStartTimeRef = useRef<number>(0);
  const momentumTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    if (momentumTimeoutRef.current) {
      clearTimeout(momentumTimeoutRef.current);
      momentumTimeoutRef.current = null;
    }
    accelerationStartTimeRef.current = 0;
  }, []);

  const startAutoScroll = useCallback((direction: 'up' | 'down', speed: number) => {
    stopAutoScroll();
    
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Set acceleration start time for this scroll session
    accelerationStartTimeRef.current = Date.now();
    
    const scrollDelay = 16; // 60fps for smooth scrolling
    
    autoScrollIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < scrollDelay) return;
      
      lastScrollTimeRef.current = now;
      
      // Calculate acceleration factor (increases over time, max 2x after 1 second)
      const accelerationTime = now - accelerationStartTimeRef.current;
      const accelerationFactor = Math.min(2, 1 + (accelerationTime / 1000));
      
      // Base scroll amount: 5-25px range with exponential curve
      const baseScrollAmount = Math.max(5, Math.min(25, speed * speed / 400 + 5));
      const scrollAmount = baseScrollAmount * accelerationFactor;
      
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
    
    // Slightly larger scroll zones for easier dragging
    const scrollZone = 60;
    const deadZone = 5; // Smaller dead zone for easier edge triggering
    
    const topZoneStart = rect.top + deadZone;
    const topZoneEnd = rect.top + scrollZone;
    const bottomZoneStart = rect.bottom - scrollZone;
    const bottomZoneEnd = rect.bottom - deadZone;
    
    if (mouseY >= topZoneStart && mouseY <= topZoneEnd) {
      // Mouse is in top scroll zone
      const distanceFromEdge = topZoneEnd - mouseY;
      const normalizedDistance = distanceFromEdge / (scrollZone - deadZone);
      
      // Exponential speed curve with slight boost for upward scrolling
      const speed = Math.pow(normalizedDistance, 1.2) * 120; // Slightly faster and less exponential
      startAutoScroll('up', speed);
    } else if (mouseY >= bottomZoneStart && mouseY <= bottomZoneEnd) {
      // Mouse is in bottom scroll zone  
      const distanceFromEdge = mouseY - bottomZoneStart;
      const normalizedDistance = distanceFromEdge / (scrollZone - deadZone);
      
      // Exponential speed curve: slower near edge, faster towards center
      const speed = Math.pow(normalizedDistance, 1.5) * 100;
      startAutoScroll('down', speed);
    } else {
      // Mouse is not in scroll zones - add brief momentum before stopping
      if (autoScrollIntervalRef.current && !momentumTimeoutRef.current) {
        momentumTimeoutRef.current = setTimeout(() => {
          stopAutoScroll();
        }, 150); // 150ms momentum
      } else if (!autoScrollIntervalRef.current) {
        stopAutoScroll();
      }
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
