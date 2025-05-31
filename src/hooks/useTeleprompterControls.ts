
import { useState, useEffect, useRef } from 'react';

export const useTeleprompterControls = () => {
  const [fontSize, setFontSize] = useState(24);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUppercase, setIsUppercase] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen and escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleScrolling = () => {
    setIsScrolling(!isScrolling);
  };

  const resetScroll = () => {
    setIsScrolling(false);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => Math.max(12, Math.min(120, prev + delta)));
  };

  const adjustScrollSpeed = (delta: number) => {
    setScrollSpeed(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleUppercase = () => {
    setIsUppercase(!isUppercase);
  };

  return {
    fontSize,
    isScrolling,
    scrollSpeed,
    isFullscreen,
    isUppercase,
    containerRef,
    toggleScrolling,
    resetScroll,
    adjustFontSize,
    adjustScrollSpeed,
    toggleFullscreen,
    toggleUppercase,
    setIsScrolling
  };
};
