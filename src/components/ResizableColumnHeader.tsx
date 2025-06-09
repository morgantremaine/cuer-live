
import React, { useRef, useCallback, useEffect } from 'react';
import { Column } from '@/hooks/useColumnsManager';

interface ResizableColumnHeaderProps {
  column: Column;
  width: number;
  onWidthChange: (columnId: string, width: number) => void;
  children: React.ReactNode;
}

export const ResizableColumnHeader: React.FC<ResizableColumnHeaderProps> = ({
  column,
  width,
  onWidthChange,
  children
}) => {
  const headerRef = useRef<HTMLTableCellElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!headerRef.current) return;
    
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    
    // Add cursor style to body during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(80, Math.min(600, startWidthRef.current + deltaX));
      
      // Apply width directly to DOM for immediate visual feedback
      headerRef.current.style.width = `${newWidth}px`;
      headerRef.current.style.minWidth = `${newWidth}px`;
      headerRef.current.style.maxWidth = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      isDraggingRef.current = false;
      
      // Reset body styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Get the final width and update state
      const finalWidth = parseInt(headerRef.current.style.width) || width;
      
      // Clear temporary DOM styles
      headerRef.current.style.width = '';
      headerRef.current.style.minWidth = '';
      headerRef.current.style.maxWidth = '';
      
      // Update the width through the callback
      if (finalWidth !== startWidthRef.current) {
        onWidthChange(column.id, finalWidth);
      }
      
      // Clean up event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.id, width, onWidthChange]);

  // Apply the width to the header
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.style.width = `${width}px`;
    }
  }, [width]);

  return (
    <th 
      ref={headerRef}
      className="px-2 py-3 text-left text-sm font-semibold text-white relative border-r border-blue-500 bg-blue-600 dark:bg-blue-700"
      style={{ width: `${width}px` }}
    >
      <div className="select-none truncate">
        {children}
      </div>
      <div 
        ref={resizeHandleRef}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 hover:w-2 transition-all duration-150 z-20"
        onMouseDown={handleResizeStart}
        title="Resize column"
      />
    </th>
  );
};
