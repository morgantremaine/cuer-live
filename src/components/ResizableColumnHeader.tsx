
import React, { useState, useRef, useEffect } from 'react';
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

  // Sync currentWidth with prop width when not resizing
  useEffect(() => {
    if (!isResizing) {
      setCurrentWidth(parseInt(width));
    }
  }, [width, isResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = parseInt(width);
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(50, startWidth.current + diff);
      // Update visual width immediately for smooth feedback
      setCurrentWidth(newWidth);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false);
      // Calculate final width and trigger callback
      const diff = e.clientX - startX.current;
      const finalWidth = Math.max(50, startWidth.current + diff);
      onWidthChange(column.id, finalWidth);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th 
      className="px-1 py-2 text-left text-sm font-semibold text-white relative select-none border-r border-blue-500"
      style={{ width: `${currentWidth}px` }}
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
