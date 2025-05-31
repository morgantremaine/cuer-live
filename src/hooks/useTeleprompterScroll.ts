
import { useEffect, useRef } from 'react';

export const useTeleprompterScroll = (
  isScrolling: boolean,
  scrollSpeed: number,
  containerRef: React.RefObject<HTMLDivElement>
) => {
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Handle smooth scrolling with requestAnimationFrame
  useEffect(() => {
    const scroll = (currentTime: number) => {
      if (!containerRef.current || !isScrolling) return;

      // Calculate time delta for consistent speed regardless of frame rate
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // Convert scroll speed to pixels per second (speed * 60 pixels per second)
      const pixelsPerSecond = scrollSpeed * 60;
      const scrollIncrement = (pixelsPerSecond * deltaTime) / 1000;

      containerRef.current.scrollTop += scrollIncrement;

      // Continue the animation
      if (isScrolling) {
        animationFrameRef.current = requestAnimationFrame(scroll);
      }
    };

    if (isScrolling && containerRef.current) {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(scroll);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScrolling, scrollSpeed, containerRef]);
};
