
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
  const [tempWidth, setTempWidth] = useState(0);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Parse the current width properly
    const currentWidth = parseInt(width.replace('px', '')) || 120;
    console.log('🎯 Starting resize for column:', column.id, 'from width:', currentWidth);
    
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = currentWidth;
    setTempWidth(currentWidth);
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(50, startWidth.current + diff);
      setTempWidth(newWidth);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const finalWidth = Math.max(50, startWidth.current + diff);
      
      console.log('🎯 Ending resize for column:', column.id, 'final width:', finalWidth);
      
      setIsResizing(false);
      
      // Only call onWidthChange once at the very end
      onWidthChange(column.id, finalWidth);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // During resize, completely override everything with tempWidth
  // When not resizing, use the prop width
  const displayWidth = isResizing ? `${tempWidth}px` : width;

  return (
    <th 
      className="px-1 py-2 text-left text-sm font-semibold text-white relative select-none border-r border-blue-500"
      style={{ 
        width: displayWidth,
        minWidth: displayWidth,
        maxWidth: displayWidth
      }}
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
