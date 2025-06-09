
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
  const startX = useRef(0);
  const startWidth = useRef(0);
  const finalWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = parseInt(width);
    finalWidth.current = startWidth.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!headerRef.current) return;
      
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(50, Math.min(800, startWidth.current + diff));
      finalWidth.current = newWidth;
      
      // Direct DOM manipulation for smooth visual feedback
      headerRef.current.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Only trigger callback once at the end with final width
      if (finalWidth.current !== startWidth.current) {
        onWidthChange(column.id, finalWidth.current);
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
        style={{ backgroundColor: isResizing ? '#60a5fa' : 'transparent' }}
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
