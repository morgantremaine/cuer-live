
import React, { useState, useRef } from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { Separator } from '@/components/ui/separator';

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
      const newWidth = Math.max(80, startWidth.current + diff); // Minimum width of 80px
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
      className="px-4 py-3 text-left text-sm font-semibold text-white relative select-none"
      style={{ width }}
    >
      {showLeftSeparator && (
        <Separator orientation="vertical" className="absolute left-0 top-0 h-full bg-gray-500" />
      )}
      {children}
      <div 
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors flex items-center justify-center"
        onMouseDown={handleMouseDown}
        style={{ backgroundColor: isResizing ? '#60a5fa' : 'transparent' }}
      >
        <div className="w-0.5 h-6 bg-gray-400 opacity-60" />
      </div>
      <Separator orientation="vertical" className="absolute right-0 top-0 h-full bg-gray-500" />
    </th>
  );
};

export default ResizableColumnHeader;
