
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
  const [resizeWidth, setResizeWidth] = useState(0);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const isDragging = useRef(false);

  // Only update display width when NOT resizing to prevent interference
  useEffect(() => {
    if (!isResizing) {
      setResizeWidth(0);
    }
  }, [width, isResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('🔽 Mouse down - starting resize');
    e.preventDefault();
    setIsResizing(true);
    isDragging.current = true;
    startX.current = e.clientX;
    
    // Parse the current width properly
    const currentWidth = parseInt(width.replace('px', '')) || 120;
    startWidth.current = currentWidth;
    setResizeWidth(currentWidth);
    
    console.log('📏 Initial resize state:', { currentWidth, startX: startX.current });
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(50, startWidth.current + diff);
      
      console.log('🔄 Resizing:', { 
        diff, 
        startWidth: startWidth.current, 
        newWidth,
        mouseX: e.clientX,
        startX: startX.current
      });
      
      setResizeWidth(newWidth);
    };

    const handleMouseUp = (e: MouseEvent) => {
      console.log('🔼 Mouse up - ending resize');
      setIsResizing(false);
      isDragging.current = false;
      
      const diff = e.clientX - startX.current;
      const finalWidth = Math.max(50, startWidth.current + diff);
      
      console.log('✅ Final resize:', { finalWidth });
      
      // Clear the resize width state to prevent visual inconsistencies
      setResizeWidth(0);
      
      onWidthChange(column.id, finalWidth);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Use resizeWidth during resize, otherwise use the prop width
  const displayWidth = isResizing && resizeWidth > 0 ? `${resizeWidth}px` : width;

  console.log('🎯 Render state:', { 
    isResizing, 
    resizeWidth, 
    width, 
    displayWidth,
    columnId: column.id
  });

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
