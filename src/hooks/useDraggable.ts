import { useState, useRef, useCallback, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  storageKey?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const useDraggable = (options: UseDraggableOptions = {}) => {
  const { initialPosition = { x: 0, y: 0 }, storageKey, onDragStart, onDragEnd } = options;
  
  // Load position from localStorage if storageKey is provided
  const getInitialPosition = useCallback(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return initialPosition;
        }
      }
    }
    return initialPosition;
  }, [initialPosition, storageKey]);

  const [position, setPosition] = useState<Position>(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState<Position>({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  
  const dragRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Save position to localStorage when it changes
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(position));
    }
  }, [position, storageKey]);

  const constrainToViewport = useCallback((pos: Position, elementWidth: number, elementHeight: number): Position => {
    const maxX = window.innerWidth - elementWidth;
    const maxY = window.innerHeight - elementHeight;
    
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY))
    };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Mark as moved if dragged more than 2px (very sensitive for better detection)
    if (!hasMoved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
      console.log('🚀 Drag movement detected, deltaX:', deltaX, 'deltaY:', deltaY);
      setHasMoved(true);
    }
    
    const newPosition = {
      x: elementStart.x + deltaX,
      y: elementStart.y + deltaY
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(() => {
      if (dragRef.current) {
        const rect = dragRef.current.getBoundingClientRect();
        const constrainedPosition = constrainToViewport(newPosition, rect.width, rect.height);
        setPosition(constrainedPosition);
      }
    });
  }, [isDragging, dragStart, elementStart, hasMoved, constrainToViewport]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      console.log('🛑 Mouse up, isDragging:', isDragging, 'hasMoved:', hasMoved);
      setIsDragging(false);
      
      // Don't reset hasMoved immediately - let the click handler see it first
      setTimeout(() => {
        setHasMoved(false);
      }, 10);
      
      onDragEnd?.();
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isDragging, hasMoved, onDragEnd]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    console.log('🎯 Starting drag');
    // Prevent default to avoid text selection and other browser behaviors
    e.preventDefault();
    e.stopPropagation();
    
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart(position);
    setIsDragging(true);
    setHasMoved(false);
    onDragStart?.();
  }, [position, onDragStart]);

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseleave', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleClick = useCallback((originalOnClick?: () => void) => {
    return (e: React.MouseEvent) => {
      console.log('🖱️ Click detected, hasMoved:', hasMoved, 'isDragging:', isDragging);
      
      // Only trigger click if we haven't moved (i.e., it's a click, not a drag)
      if (!hasMoved && originalOnClick) {
        console.log('✅ Triggering original click');
        originalOnClick();
      } else if (hasMoved) {
        // Prevent click event if we just finished dragging
        console.log('❌ Preventing click due to drag movement');
        e.preventDefault();
        e.stopPropagation();
      }
    };
  }, [hasMoved, isDragging]);

  // Function to reset position to bottom-right of viewport
  const resetToBottomRight = useCallback(() => {
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      const newPosition = {
        x: window.innerWidth - rect.width - 20,
        y: window.innerHeight - rect.height - 20
      };
      const constrainedPosition = constrainToViewport(newPosition, rect.width, rect.height);
      setPosition(constrainedPosition);
    }
  }, [constrainToViewport]);

  return {
    position,
    isDragging,
    dragRef,
    startDrag,
    handleClick,
    hasMoved,
    resetToBottomRight
  };
};