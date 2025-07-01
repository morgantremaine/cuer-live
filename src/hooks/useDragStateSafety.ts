
import { useEffect, useRef } from 'react';

export const useDragStateSafety = (
  draggedItemIndex: number | null,
  clearDragState: () => void
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartTimeRef = useRef<number | null>(null);

  // Track when drag starts
  useEffect(() => {
    if (draggedItemIndex !== null && dragStartTimeRef.current === null) {
      dragStartTimeRef.current = Date.now();
      console.log('🕐 Drag started, setting safety timeout');
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a safety timeout to clear drag state after 5 seconds
      timeoutRef.current = setTimeout(() => {
        console.log('⚠️ Safety timeout triggered - clearing stuck drag state');
        clearDragState();
        dragStartTimeRef.current = null;
      }, 5000);
    } else if (draggedItemIndex === null && dragStartTimeRef.current !== null) {
      // Drag ended normally
      console.log('✅ Drag ended normally');
      dragStartTimeRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [draggedItemIndex, clearDragState]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Force clear drag state on page visibility change (browser tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && draggedItemIndex !== null) {
        console.log('👁️ Page hidden with active drag - clearing state');
        clearDragState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [draggedItemIndex, clearDragState]);
};
