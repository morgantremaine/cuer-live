
import React, { useState, useRef, useCallback } from 'react';
import { Column } from '@/hooks/useColumnsManager';

interface SimpleResizableColumnHeaderProps {
  column: Column;
  width: string;
  onWidthChange: (columnId: string, width: number) => void;
  children: React.ReactNode;
  showLeftSeparator?: boolean;
}

const SimpleResizableColumnHeader = React.memo(({ 
  column, 
  width, 
  onWidthChange, 
  children, 
  showLeftSeparator = false 
}: SimpleResizableColumnHeaderProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const headerRef = useRef<HTMLTableCellElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!headerRef.current) return;
    
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = parseInt(width);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!headerRef.current) return;
      
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(50, Math.min(800, startWidthRef.current + diff));
      
      // Direct DOM manipulation for immediate visual feedback
      headerRef.current.style.width = `${newWidth}px`;
      headerRef.current.style.minWidth = `${newWidth}px`;
      headerRef.current.style.maxWidth = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      if (!headerRef.current) return;
      
      const finalWidth = parseInt(headerRef.current.style.width);
      
      // Reset DOM styles to let CSS take over
      headerRef.current.style.width = '';
      headerRef.current.style.minWidth = '';
      headerRef.current.style.maxWidth = '';
      
      setIsResizing(false);
      
      // Update state with final width
      if (finalWidth !== startWidthRef.current && finalWidth >= 50 && finalWidth <= 800) {
        onWidthChange(column.id, finalWidth);
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
});

SimpleResizableColumnHeader.displayName = 'SimpleResizableColumnHeader';

export default SimpleResizableColumnHeader;
