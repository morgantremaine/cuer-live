
import React, { useRef, useCallback, forwardRef } from 'react';
import { Column } from '@/hooks/useColumnsManager';

interface ResizableColumnHeaderProps {
  column: Column;
  width: string;
  onWidthChange: (columnId: string, width: number) => void;
  children: React.ReactNode;
  showLeftSeparator?: boolean;
  isDragging?: boolean;
  style?: React.CSSProperties;
}

// Define minimum widths for different column types - optimized for content
const getMinimumWidth = (column: Column): number => {
  switch (column.key) {
    case 'duration':
    case 'startTime':
    case 'endTime':
    case 'elapsedTime':
      return 95;
    case 'segmentName':
      return 100;
    case 'talent':
      return 60;
    case 'script':
    case 'notes':
      return 120;
    case 'gfx':
    case 'video':
      return 80;
    default:
      return 50;
  }
};

const ResizableColumnHeader = forwardRef<HTMLTableHeaderCellElement, ResizableColumnHeaderProps>(({ 
  column, 
  width, 
  onWidthChange, 
  children, 
  showLeftSeparator = false,
  isDragging = false,
  style,
  ...dragProps
}, ref) => {
  const headerRef = useRef<HTMLTableHeaderCellElement>(null);
  const initialWidthRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number>();

  const minimumWidth = getMinimumWidth(column);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!headerRef.current) return;
    
    const startX = e.clientX;
    const startWidth = parseInt(width);
    initialWidthRef.current = startWidth;
    isDraggingRef.current = true;

    // Set cursor and disable text selection globally
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Visual feedback on resize handle
    const resizeHandle = headerRef.current.querySelector('.resize-handle') as HTMLElement;
    if (resizeHandle) {
      resizeHandle.style.backgroundColor = '#60a5fa';
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const deltaX = e.clientX - startX;
        // Strictly enforce minimum width constraint during drag
        const calculatedWidth = initialWidthRef.current + deltaX;
        const newWidth = Math.max(minimumWidth, calculatedWidth);
        
        // Update immediately during drag for visual feedback
        onWidthChange(column.id, newWidth);
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current || !headerRef.current) return;
      
      isDraggingRef.current = false;
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Calculate final width and strictly enforce minimum constraint
      const deltaX = e.clientX - startX;
      const calculatedWidth = initialWidthRef.current + deltaX;
      const finalWidth = Math.max(minimumWidth, calculatedWidth);
      
      // Final update on mouse up
      onWidthChange(column.id, finalWidth);
      
      // Reset global styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Reset resize handle
      const resizeHandle = headerRef.current?.querySelector('.resize-handle') as HTMLElement;
      if (resizeHandle) {
        resizeHandle.style.backgroundColor = '';
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.id, onWidthChange, width, minimumWidth]);

  // Ensure the width never goes below minimum even when passed in
  const constrainedWidth = Math.max(minimumWidth, parseInt(width));
  const constrainedWidthPx = `${constrainedWidth}px`;

  return (
    <th 
      ref={ref || headerRef}
      className={`px-2 py-1 text-left text-sm font-semibold text-white relative select-none bg-blue-600 ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{ 
        width: constrainedWidthPx, 
        minWidth: constrainedWidthPx,
        maxWidth: constrainedWidthPx,
        borderRight: '1px solid hsl(var(--border))',
        ...style
      }}
      {...dragProps}
    >
      <div className="truncate pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </div>
      
      <div 
        className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-10"
        onMouseDown={handleMouseDown}
      />
    </th>
  );
});

ResizableColumnHeader.displayName = 'ResizableColumnHeader';

export default ResizableColumnHeader;
