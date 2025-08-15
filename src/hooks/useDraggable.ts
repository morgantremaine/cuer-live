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
    
    // Mark as moved if dragged more than 5px
    if (!hasMoved && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
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
      setIsDragging(false);
      setHasMoved(false);
      onDragEnd?.();
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isDragging, onDragEnd]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    // Prevent default to avoid text selection
    e.preventDefault();
    
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
    return () => {
      // Only trigger click if we haven't moved (i.e., it's a click, not a drag)
      if (!hasMoved && originalOnClick) {
        originalOnClick();
      }
    };
  }, [hasMoved]);

  return {
    position,
    isDragging,
    dragRef,
    startDrag,
    handleClick,
    hasMoved
  };
};