
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!headerRef.current) return;
    
    const startX = e.clientX;
    const startWidth = parseInt(width);
    initialWidthRef.current = startWidth;
    isDraggingRef.current = true;

    // Disable pointer events on header content during drag
    headerRef.current.style.pointerEvents = 'none';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(50, initialWidthRef.current + deltaX);
      
      // Use CSS transform for smooth visual feedback
      const scale = newWidth / initialWidthRef.current;
      headerRef.current.style.transform = `scaleX(${scale})`;
      headerRef.current.style.transformOrigin = 'left center';
      
      // Visual feedback on resize handle
      const resizeHandle = headerRef.current.querySelector('.resize-handle') as HTMLElement;
      if (resizeHandle) {
        resizeHandle.style.backgroundColor = '#60a5fa';
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      isDraggingRef.current = false;
      
      // Calculate final width
      const deltaX = e.clientX - startX;
      const finalWidth = Math.max(50, initialWidthRef.current + deltaX);
      
      // Reset all visual transforms
      headerRef.current.style.transform = '';
      headerRef.current.style.transformOrigin = '';
      headerRef.current.style.pointerEvents = '';
      
      // Reset global styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Reset resize handle
      const resizeHandle = headerRef.current.querySelector('.resize-handle') as HTMLElement;
      if (resizeHandle) {
        resizeHandle.style.backgroundColor = '';
      }
      
      // Single state update at the end - this is the only React state change
      onWidthChange(column.id, finalWidth);
      
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
      style={{ width, minWidth: width }}
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
