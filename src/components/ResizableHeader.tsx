
import React, { useRef, useCallback } from 'react';
import { Column } from '@/hooks/useColumnsManager';

interface ResizableHeaderProps {
  column: Column;
  width: string;
  onWidthChange: (columnId: string, width: number) => void;
  children: React.ReactNode;
}

export const ResizableHeader = ({
  column,
  width,
  onWidthChange,
  children
}: ResizableHeaderProps) => {
  const headerRef = useRef<HTMLTableCellElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!headerRef.current) return;
    
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = parseInt(width);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(50, Math.min(500, startWidthRef.current + deltaX));
      
      // Direct DOM update for immediate feedback
      headerRef.current.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      isDraggingRef.current = false;
      const finalWidth = parseInt(headerRef.current.style.width);
      
      // Reset DOM style
      headerRef.current.style.width = '';
      
      // Update state
      if (finalWidth !== startWidthRef.current) {
        onWidthChange(column.id, finalWidth);
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
      className="px-1 py-2 text-left text-sm font-semibold text-white relative border-r border-blue-500 bg-blue-600 dark:bg-blue-700"
      style={{ width }}
    >
      <div className="select-none">
        {children}
      </div>
      <div 
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-10"
        onMouseDown={handleMouseDown}
      />
    </th>
  );
};
