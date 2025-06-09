
import React, { useRef, useCallback } from 'react';
import { Column } from '@/hooks/useColumnsManager';

interface ResizableColumnHeaderProps {
  column: Column;
  width: string;
  onWidthChange: (columnId: string, width: number) => void;
  children: React.ReactNode;
  showLeftSeparator?: boolean;
}

const ResizableColumnHeader = ({ 
  column, 
  width, 
  onWidthChange, 
  children, 
  showLeftSeparator = false 
}: ResizableColumnHeaderProps) => {
  const headerRef = useRef<HTMLTableHeaderCellElement>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startWidth: number;
    currentOffset: number;
  }>({
    isDragging: false,
    startX: 0,
    startWidth: 0,
    currentOffset: 0
  });

  const updateVisualFeedback = useCallback((offset: number) => {
    if (!headerRef.current) return;
    
    const dragState = dragStateRef.current;
    dragState.currentOffset = offset;
    
    // Pure CSS transform - no React state updates
    const newWidth = Math.max(50, dragState.startWidth + offset);
    headerRef.current.style.width = `${newWidth}px`;
    
    // Move the resize handle with the mouse
    const resizeHandle = headerRef.current.querySelector('.resize-handle') as HTMLElement;
    if (resizeHandle) {
      resizeHandle.style.backgroundColor = '#60a5fa';
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    const dragState = dragStateRef.current;
    dragState.isDragging = true;
    dragState.startX = e.clientX;
    dragState.startWidth = parseInt(width);
    dragState.currentOffset = 0;

    // Disable transitions during drag
    if (headerRef.current) {
      headerRef.current.style.transition = 'none';
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging) return;
      
      const offset = e.clientX - dragState.startX;
      updateVisualFeedback(offset);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragState.isDragging) return;
      
      dragState.isDragging = false;
      
      // Calculate final width
      const finalOffset = e.clientX - dragState.startX;
      const newWidth = Math.max(50, dragState.startWidth + finalOffset);
      
      // Re-enable transitions
      if (headerRef.current) {
        headerRef.current.style.transition = '';
        const resizeHandle = headerRef.current.querySelector('.resize-handle') as HTMLElement;
        if (resizeHandle) {
          resizeHandle.style.backgroundColor = '';
        }
      }
      
      // Single state update at the end
      onWidthChange(column.id, newWidth);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.id, onWidthChange, width, updateVisualFeedback]);

  return (
    <th 
      ref={headerRef}
      className="px-1 py-2 text-left text-sm font-semibold text-white relative select-none border-r border-blue-500 transition-all duration-100"
      style={{ width }}
    >
      {showLeftSeparator && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-500" />
      )}
      
      <div className="truncate pr-2">
        {children}
      </div>
      
      <div 
        className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </th>
  );
};

export default ResizableColumnHeader;
