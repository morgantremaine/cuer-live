
import React, { useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Column } from '@/hooks/useColumnsManager';

interface ResizableColumnHeaderProps {
  column: Column;
  width: string;
  onWidthChange: (columnId: string, width: number) => void;
  onAutoResize?: () => void;
  children: React.ReactNode;
  showLeftSeparator?: boolean;
  isLastColumn?: boolean;
  zoomLevel?: number;
}

// Minimum widths are shared to keep header/body perfectly aligned
import { getMinimumWidth } from '@/utils/columnSizing';

const ResizableColumnHeader = ({ 
  column, 
  width, 
  onWidthChange, 
  onAutoResize,
  children, 
  showLeftSeparator = false,
  isLastColumn = false,
  zoomLevel = 1
}: ResizableColumnHeaderProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });
  const headerRef = useRef<HTMLTableHeaderCellElement>(null);
  const isResizingRef = useRef<boolean>(false);
  const initialWidthRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  const minimumWidth = getMinimumWidth(column) * zoomLevel;

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onAutoResize) {
      onAutoResize();
    }
  }, [onAutoResize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent drag from starting
    
    if (!headerRef.current) return;
    
    isResizingRef.current = true;
    
    const startX = e.clientX;
    const startWidth = parseInt(width.replace('px', ''));
    initialWidthRef.current = startWidth;

    // Set cursor and disable text selection globally
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Visual feedback on resize handle
    const resizeHandle = headerRef.current.querySelector('.resize-handle') as HTMLElement;
    if (resizeHandle) {
      resizeHandle.style.backgroundColor = '#60a5fa';
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !headerRef.current) return;
      
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
      if (!isResizingRef.current || !headerRef.current) return;
      
      isResizingRef.current = false;
      
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

  // Parse width value and ensure it's a valid pixel value
  const widthValue = parseInt(width.replace('px', ''));
  const constrainedWidth = Math.max(minimumWidth, isNaN(widthValue) ? minimumWidth : widthValue);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${constrainedWidth}px`,
    minWidth: `${minimumWidth}px`,
    maxWidth: `${constrainedWidth}px`,
    borderRight: '1px solid hsl(var(--border))',
    zIndex: isDragging ? 1000 : 'auto',
    position: isDragging ? 'relative' as const : undefined,
  };

  // Create listeners that exclude the resize handle and right-clicks
  const dragListeners = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      // Don't start drag if right-clicking (for context menu)
      if (e.button === 2) {
        return;
      }
      
      // Don't start drag if clicking on resize handle
      if (isResizingRef.current || 
          (e.target as HTMLElement).classList.contains('resize-handle') ||
          (e.target as HTMLElement).closest('.resize-handle')) {
        return;
      }
      listeners?.onPointerDown?.(e);
    }
  };

  return (
    <th 
      ref={(node) => {
        setNodeRef(node);
        headerRef.current = node;
      }}
      className={`px-2 py-1 text-left text-sm font-semibold text-white relative select-none bg-blue-600 ${
        isDragging ? 'opacity-50' : ''
      } cursor-move`}
      style={style}
      onContextMenu={(e) => e.preventDefault()} // Prevent browser context menu
      {...attributes}
      {...dragListeners}
    >
      <div 
        className="truncate pr-2 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          width: `${constrainedWidth - 16}px`,
          minWidth: `${minimumWidth - 16}px`,
          maxWidth: `${constrainedWidth - 16}px`
        }}
      >
        {children}
      </div>
      
      <div 
        className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-10 pointer-events-auto"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title="Double-click to auto-resize column"
      />
    </th>
  );
};

export default ResizableColumnHeader;
