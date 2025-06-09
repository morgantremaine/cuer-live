
import React, { useState, useRef, useCallback } from 'react';
import { Column } from '@/hooks/useColumnsManager';

interface ResizableColumnHeaderProps {
  column: Column;
  width: string;
  onWidthChange: (columnId: string, width: number) => void;
  children: React.ReactNode;
  showLeftSeparator?: boolean;
}

const ResizableColumnHeader = React.memo(({ 
  column, 
  width, 
  onWidthChange, 
  children, 
  showLeftSeparator = false 
}: ResizableColumnHeaderProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const headerRef = useRef<HTMLTableCellElement>(null);
  const isDraggingRef = useRef(false);
  const startWidthRef = useRef(0);
  const originalWidthRef = useRef<string>('');

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDraggingRef.current) return;
    
    isDraggingRef.current = true;
    setIsResizing(true);
    
    const startX = e.clientX;
    startWidthRef.current = parseInt(width);
    originalWidthRef.current = width;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, Math.min(800, startWidthRef.current + diff));
      
      // Direct DOM manipulation for instant visual feedback
      headerRef.current.style.width = `${newWidth}px`;
      headerRef.current.style.minWidth = `${newWidth}px`;
      headerRef.current.style.maxWidth = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      const finalWidth = parseInt(headerRef.current.style.width);
      
      // Reset DOM styles
      headerRef.current.style.width = '';
      headerRef.current.style.minWidth = '';
      headerRef.current.style.maxWidth = '';
      
      isDraggingRef.current = false;
      setIsResizing(false);
      
      // Only trigger state update if width actually changed
      if (finalWidth !== startWidthRef.current && finalWidth >= 50 && finalWidth <= 800) {
        // Use setTimeout to ensure this happens after the current render cycle
        setTimeout(() => {
          onWidthChange(column.id, finalWidth);
        }, 0);
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
      className="px-1 py-2 text-left text-sm font-semibold text-white relative select-none border-r border-blue-500"
      style={{ width }}
    >
      {showLeftSeparator && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-500" />
      )}
      {children}
      <div 
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors"
        onMouseDown={handleMouseDown}
        style={{ 
          backgroundColor: isResizing ? '#60a5fa' : 'transparent',
          zIndex: 10
        }}
      />
    </th>
  );
}, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.column.id === nextProps.column.id &&
    prevProps.width === nextProps.width &&
    prevProps.children === nextProps.children &&
    prevProps.showLeftSeparator === nextProps.showLeftSeparator
  );
});

ResizableColumnHeader.displayName = 'ResizableColumnHeader';

export default ResizableColumnHeader;
