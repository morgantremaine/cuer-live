import { useState, useEffect, useRef } from 'react';

export const useTeleprompterControls = () => {
  const [fontSize, setFontSize] = useState(24);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUppercase, setIsUppercase] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Define speed steps: negative for reverse, 0 for stop, positive for forward
  // Extended range from -5x to 5x in 0.5x steps
  const speedSteps = [-5, -4.5, -4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(12); // Start at 1x (index 12)

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default behavior for our handled keys
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
        event.preventDefault();
      }

      switch (event.key) {
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          }
          break;
        
        case ' ': // Spacebar for play/pause
          toggleScrolling();
          break;
        
        case 'ArrowRight':
        case 'ArrowUp':
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
        
        case 'ArrowLeft':
        case 'ArrowDown':
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
      }
    };

    // Add event listener to document to capture all keyboard events
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, isScrolling]);

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
    setIsScrolling,
    getCurrentSpeed,
    isReverse
  };
};
