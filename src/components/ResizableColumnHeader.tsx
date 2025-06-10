
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
  const initialWidthRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number>();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!headerRef.current) return;
    
    const startX = e.clientX;
    const startWidth = parseInt(width);
    initialWidthRef.current = startWidth;
    isDraggingRef.current = true;

    // Set cursor and disable text selection globally
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Visual feedback on resize handle
    const resizeHandle = headerRef.current.querySelector('.resize-handle') as HTMLElement;
    if (resizeHandle) {
      resizeHandle.style.backgroundColor = '#60a5fa';
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(50, initialWidthRef.current + deltaX);
        
        // Update the actual width during drag for real-time preview
        onWidthChange(column.id, newWidth);
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      isDraggingRef.current = false;
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Calculate final width and ensure it's applied
      const deltaX = e.clientX - startX;
      const finalWidth = Math.max(50, initialWidthRef.current + deltaX);
      
      // Final width update to ensure state is correct
      onWidthChange(column.id, finalWidth);
      
      // Reset global styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Reset resize handle
      const resizeHandle = headerRef.current.querySelector('.resize-handle') as HTMLElement;
      if (resizeHandle) {
        resizeHandle.style.backgroundColor = '';
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.id, onWidthChange, width]);

  return (
    <th 
      ref={headerRef}
      className="px-1 py-2 text-left text-sm font-semibold text-white relative select-none border-r border-blue-500"
      style={{ 
        width, 
        minWidth: width, 
        maxWidth: width,
        display: 'table-cell',
        visibility: 'visible',
        opacity: 1
      }}
    >
      {showLeftSeparator && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-500" />
      )}
      
      <div className="truncate pr-2">
        {children}
      </div>
      
      <div 
        className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-10"
        onMouseDown={handleMouseDown}
      />
    </th>
  );
};

export default ResizableColumnHeader;
