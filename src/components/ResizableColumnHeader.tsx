
import React, { useState, useRef, useCallback } from 'react';
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
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const headerRef = useRef<HTMLTableHeaderCellElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setDragOffset(0);
    startX.current = e.clientX;
    startWidth.current = parseInt(width);

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      setDragOffset(diff);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false);
      
      const finalDiff = e.clientX - startX.current;
      const newWidth = Math.max(50, startWidth.current + finalDiff);
      
      // Reset drag offset first, then update width
      setDragOffset(0);
      onWidthChange(column.id, newWidth);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.id, onWidthChange, width]);

  // Calculate the visual width during resize
  const baseWidth = parseInt(width);
  const visualWidth = Math.max(50, baseWidth + dragOffset);
  
  return (
    <th 
      ref={headerRef}
      className="px-1 py-2 text-left text-sm font-semibold text-white relative select-none border-r border-blue-500"
      style={{ 
        width: isResizing ? `${visualWidth}px` : width,
        transition: isResizing ? 'none' : 'width 0.1s ease-out'
      }}
    >
      {showLeftSeparator && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-500" />
      )}
      
      <div className="truncate">
        {children}
      </div>
      
      <div 
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors"
        onMouseDown={handleMouseDown}
        style={{ 
          backgroundColor: isResizing ? '#60a5fa' : 'transparent',
          right: isResizing ? `${-dragOffset}px` : '0px',
          transition: isResizing ? 'none' : 'right 0.1s ease-out'
        }}
      />
    </th>
  );
};

export default ResizableColumnHeader;
