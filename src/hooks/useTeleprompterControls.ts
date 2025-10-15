
import { useState, useEffect, useRef } from 'react';

export const useTeleprompterControls = () => {
  const [fontSize, setFontSize] = useState(24);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUppercase, setIsUppercase] = useState(false);
  const [isBold, setIsBold] = useState(false); // Changed from true to false
  const [showAllSegments, setShowAllSegments] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Define speed steps: negative for reverse, 0 for stop, positive for forward
  // Extended range from -5x to 5x in 0.5x steps
  const speedSteps = [-5, -4.5, -4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(12); // Start at 1x (index 12)

  // Handle keyboard controls - only when in fullscreen mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts in fullscreen mode
      if (!isFullscreen) {
        // Still handle Escape to exit fullscreen
        if (event.key === 'Escape') {
          setIsFullscreen(false);
        }
        return;
      }

      // Prevent default behavior for our handled keys when in fullscreen
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'b', 'B'].includes(event.key)) {
        event.preventDefault();
      }

      switch (event.key) {
        case 'Escape':
          setIsFullscreen(false);
          break;
        
        case ' ': // Spacebar for play/pause
          toggleScrolling();
          break;
        
        case 'b':
        case 'B':
          toggleBlackout();
          break;
        
        case 'ArrowLeft':
        case 'ArrowUp':
          // Decrease speed (move left in speed array)
          setCurrentSpeedIndex(prevIndex => {
            const newIndex = Math.max(0, prevIndex - 1);
            const newSpeed = speedSteps[newIndex];
            setScrollSpeed(Math.abs(newSpeed)); // Store absolute value for scroll hook
            
            // Auto-start scrolling if speed is not 0
            if (newSpeed !== 0) {
              setIsScrolling(true);
            } else {
              setIsScrolling(false);
            }
            
            return newIndex;
          });
          break;
        
        case 'ArrowRight':
        case 'ArrowDown':
          // Increase speed (move right in speed array)
          setCurrentSpeedIndex(prevIndex => {
            const newIndex = Math.min(speedSteps.length - 1, prevIndex + 1);
            const newSpeed = speedSteps[newIndex];
            setScrollSpeed(Math.abs(newSpeed)); // Store absolute value for scroll hook
            
            // Auto-start scrolling if speed is not 0
            if (newSpeed !== 0) {
              setIsScrolling(true);
            } else {
              setIsScrolling(false);
            }
            
            return newIndex;
          });
          break;
      }
    };

    // Add event listener to document to capture all keyboard events
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, isScrolling]);

  // Listen for browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      // If browser exits fullscreen, update our state
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Get current speed value and direction
  const getCurrentSpeed = () => speedSteps[currentSpeedIndex];
  const isReverse = () => getCurrentSpeed() < 0;

  const toggleScrolling = () => {
    const currentSpeed = getCurrentSpeed();
    
    if (currentSpeed === 0) {
      // If at 0x speed, set to 1x and start scrolling
      setCurrentSpeedIndex(12); // 1x speed
      setScrollSpeed(1);
      setIsScrolling(true);
    } else {
      // Toggle scrolling state
      setIsScrolling(!isScrolling);
    }
  };

  const resetScroll = () => {
    setIsScrolling(false);
    setCurrentSpeedIndex(12); // Reset to 1x speed
    setScrollSpeed(1);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => Math.max(12, Math.min(120, prev + delta)));
  };

  const adjustScrollSpeed = (delta: number) => {
    // Find current speed in array and adjust
    const currentSpeed = scrollSpeed * (isReverse() ? -1 : 1);
    const currentIndex = speedSteps.findIndex(speed => speed === currentSpeed);
    
    if (currentIndex !== -1) {
      const newIndex = Math.max(0, Math.min(speedSteps.length - 1, currentIndex + (delta > 0 ? 1 : -1)));
      setCurrentSpeedIndex(newIndex);
      const newSpeed = speedSteps[newIndex];
      setScrollSpeed(Math.abs(newSpeed));
      
      if (newSpeed !== 0) {
        setIsScrolling(true);
      } else {
        setIsScrolling(false);
      }
    }
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      // Enter fullscreen mode
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.error('Error entering fullscreen:', error);
        // Fallback to just UI fullscreen if browser fullscreen fails
        setIsFullscreen(true);
      }
    } else {
      // Exit fullscreen mode
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
        // Fallback to just UI fullscreen toggle
        setIsFullscreen(false);
      }
    }
  };

  const toggleUppercase = () => {
    setIsUppercase(!isUppercase);
  };

  const toggleBold = () => {
    setIsBold(!isBold);
  };

  const toggleShowAllSegments = () => {
    setShowAllSegments(!showAllSegments);
  };

  const toggleBlackout = () => {
    setIsBlackout(!isBlackout);
  };

  return {
    fontSize,
    isScrolling,
    scrollSpeed,
    isFullscreen,
    isUppercase,
    isBold,
    showAllSegments,
    isBlackout,
    containerRef,
    toggleScrolling,
    resetScroll,
    adjustFontSize,
    adjustScrollSpeed,
    toggleFullscreen,
    toggleUppercase,
    toggleBold,
    toggleShowAllSegments,
    toggleBlackout,
    setIsScrolling,
    getCurrentSpeed,
    isReverse
  };
};
