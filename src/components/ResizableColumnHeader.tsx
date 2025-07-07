
import React, { useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Column } from '@/hooks/useColumnsManager';

interface ResizableColumnHeaderProps {
  column: Column;
  width: string;
  onWidthChange: (columnId: string, width: number, isManualResize?: boolean, resetToAutoSize?: boolean) => void;
  children: React.ReactNode;
  showLeftSeparator?: boolean;
  isLastColumn?: boolean;
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

const ResizableColumnHeader = ({ 
  column, 
  width, 
  onWidthChange, 
  children, 
  showLeftSeparator = false,
  isLastColumn = false
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

  const minimumWidth = getMinimumWidth(column);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!headerRef.current) return;
    
    isResizingRef.current = true;
    
    // Use pointer capture to prevent drag interference (simplified)
    const target = e.target as HTMLElement;
    if (target.setPointerCapture && 'pointerId' in e.nativeEvent) {
      target.setPointerCapture((e.nativeEvent as PointerEvent).pointerId);
    }
    
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
      resizeHandle.style.zIndex = '9999';
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
        const calculatedWidth = initialWidthRef.current + deltaX;
        const newWidth = Math.max(minimumWidth, calculatedWidth);
        
        // Update immediately during drag for visual feedback
        onWidthChange(column.id, newWidth);
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isResizingRef.current || !headerRef.current) return;
      
      isResizingRef.current = false;
      
      // Release pointer capture (simplified)
      const target = e.target as HTMLElement;
      if (target.releasePointerCapture) {
        try {
          // Use a fixed pointer ID since we can't access the original
          target.releasePointerCapture(1);
        } catch (error) {
          // Ignore errors if pointer capture wasn't set
        }
      }
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Calculate final width and strictly enforce minimum constraint
      const deltaX = e.clientX - startX;
      const calculatedWidth = initialWidthRef.current + deltaX;
      const finalWidth = Math.max(minimumWidth, calculatedWidth);
      
      // Final update on mouse up - this marks the column as manually resized
      onWidthChange(column.id, finalWidth);
      
      // Reset global styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Reset resize handle
      const resizeHandle = headerRef.current?.querySelector('.resize-handle') as HTMLElement;
      if (resizeHandle) {
        resizeHandle.style.backgroundColor = '';
        resizeHandle.style.zIndex = '';
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.id, onWidthChange, width, minimumWidth]);

  // Parse width value - use the exact width passed from getColumnWidth (which handles expansion)
  const widthValue = parseInt(width.replace('px', ''));
  const actualWidth = isNaN(widthValue) ? minimumWidth : widthValue;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // CRITICAL: Use the exact width from getColumnWidth (includes expansion)
    width: width,
    minWidth: `${minimumWidth}px`,
    // NO maxWidth constraint - let it expand as calculated
    borderRight: '1px solid hsl(var(--border))',
    zIndex: isDragging ? 1000 : 'auto',
    position: isDragging ? 'relative' as const : undefined,
  };

  // Double-click handler to reset to auto-size
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset this column to auto-sizing
    if (column.manuallyResized) {
      // Find the natural width and use it
      const naturalWidth = parseInt((column.width || '150px').replace('px', ''));
      onWidthChange(column.id, naturalWidth, false, true); // Not manual, reset flag
    }
  }, [column.id, column.manuallyResized, column.width, onWidthChange]);

  // Enhanced drag listeners with better separation from resize
  const dragListeners = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      // CRITICAL: Don't start drag if:
      // 1. Currently resizing
      // 2. Clicking on or near resize handle (with buffer zone)
      // 3. Right edge of header (last 10px)
      if (isResizingRef.current) return;
      
      const target = e.target as HTMLElement;
      const isResizeHandle = target.classList.contains('resize-handle') || 
                            target.closest('.resize-handle');
      
      // Calculate if click is in the resize zone (last 10px of header)
      const headerRect = headerRef.current?.getBoundingClientRect();
      const isInResizeZone = headerRect && 
                            (e.clientX > headerRect.right - 10);
      
      if (isResizeHandle || isInResizeZone) {
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
      {...attributes}
      {...dragListeners}
    >
      <div 
        className="truncate pr-2 overflow-hidden text-ellipsis whitespace-nowrap pointer-events-none"
      >
        {children}
      </div>
      
      {/* Enhanced resize handle with better event isolation and double-click */}
      <div 
        className="resize-handle absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-blue-400 transition-colors pointer-events-auto"
        style={{ zIndex: 100 }} // Higher z-index to ensure it's always on top
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag from starting
        onTouchStart={(e) => e.stopPropagation()} // Prevent touch drag
        title={column.manuallyResized ? "Double-click to reset to auto-size" : "Drag to resize column"}
      />
      
      {/* Manual resize indicator - more visible blue dot */}
      {column.manuallyResized && (
        <div 
          className="absolute right-0.5 top-0.5 w-2 h-2 bg-blue-300 rounded-full opacity-80 border border-blue-500"
          title="Manually resized - double-click resize handle to reset"
          style={{ zIndex: 101 }}
        />
      )}
    </th>
  );
};

export default ResizableColumnHeader;
