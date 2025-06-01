
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
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = parseInt(width);
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(50, startWidth.current + diff);
      console.log('ResizableColumnHeader calling onWidthChange:', column.id, newWidth);
      onWidthChange(column.id, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th 
      className="px-1 py-1 text-left text-sm font-semibold text-white relative select-none border-r border-blue-500"
      style={{ width }}
    >
      {showLeftSeparator && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-500" />
      )}
      {children}
      <div 
        className="absolute -right-1 top-0 bottom-0 w-3 cursor-col-resize hover:bg-blue-400 hover:bg-opacity-30 transition-colors flex items-center justify-center"
        onMouseDown={handleMouseDown}
        style={{ backgroundColor: isResizing ? 'rgba(96, 165, 250, 0.3)' : 'transparent' }}
      >
        <div className="w-px h-full bg-blue-500 opacity-60" />
      </div>
    </th>
  );
};

export default ResizableColumnHeader;
