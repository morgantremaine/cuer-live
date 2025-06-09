
import React, { useState, useRef } from 'react';
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
  const [currentWidth, setCurrentWidth] = useState(parseInt(width));
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = parseInt(width);
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(50, startWidth.current + diff);
      // Only update visual width during resize, don't trigger callbacks
      setCurrentWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Only call onWidthChange when resize is complete
      const finalWidth = Math.max(50, startWidth.current + (event as MouseEvent).clientX - startX.current);
      onWidthChange(column.id, finalWidth);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const displayWidth = isResizing ? `${currentWidth}px` : width;

  return (
    <th 
      className="px-1 py-2 text-left text-sm font-semibold text-white relative select-none border-r border-blue-500"
      style={{ width: displayWidth }}
    >
      {showLeftSeparator && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-500" />
      )}
      {children}
      <div 
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors"
        onMouseDown={handleMouseDown}
        style={{ backgroundColor: isResizing ? '#60a5fa' : 'transparent' }}
      />
    </th>
  );
};

export default ResizableColumnHeader;
