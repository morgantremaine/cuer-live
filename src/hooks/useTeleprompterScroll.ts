
import { useEffect, useRef } from 'react';

export const useTeleprompterScroll = (
  isScrolling: boolean,
  scrollSpeed: number,
  containerRef: React.RefObject<HTMLDivElement>
) => {
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle smooth scrolling
  useEffect(() => {
    if (isScrolling && containerRef.current) {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop += scrollSpeed;
        }
      }, 16); // ~60fps
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isScrolling, scrollSpeed, containerRef]);
};
