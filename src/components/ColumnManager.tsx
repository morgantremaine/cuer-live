
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useColumnLayoutStorage } from '@/hooks/useColumnLayoutStorage';
import LayoutManager from './ColumnManager/LayoutManager';
import ColumnEditor from './ColumnManager/ColumnEditor';
import ColumnList from './ColumnManager/ColumnList';
import { Column } from '@/types/columns';

interface ColumnManagerProps {
  columns: Column[];
  onAddColumn: (name: string, isCollapsible?: boolean) => void;
  onReorderColumns: (columns: Column[]) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleColumnVisibility: (columnId: string) => void;
  onLoadLayout: (columns: Column[]) => void;
  onRenameColumn?: (columnId: string, newName: string) => void;
  onClose: () => void;
  debugColumns?: () => void;
  resetToDefaults?: () => void;
  isOpen: boolean;
  savedLayouts?: any[]; // Add savedLayouts prop
  layoutOperations?: {  // Add layout operations prop
    saveLayout: (name: string, columns: Column[]) => Promise<void>;
    updateLayout: (id: string, name: string, columns: Column[]) => Promise<void>;
    renameLayout: (id: string, newName: string) => Promise<void>;
    deleteLayout: (id: string) => Promise<void>;
    canEditLayout: (layout: any) => boolean;
    loading: boolean;
  };
}

const ColumnManager = ({ 
  columns, 
  onAddColumn, 
  onReorderColumns, 
  onDeleteColumn, 
  onToggleColumnVisibility,
  onLoadLayout,
  onRenameColumn,
  onClose,
  debugColumns,
  resetToDefaults,
  isOpen,
  savedLayouts = [],
  layoutOperations
}: ColumnManagerProps) => {
  // Use provided layout operations or fallback to hook
  const hookOperations = useColumnLayoutStorage();
  const operations = layoutOperations || hookOperations;
  
  const { 
    saveLayout, 
    updateLayout, 
    renameLayout, 
    deleteLayout,
    canEditLayout,
    loading
  } = operations;

  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 800, height: 600 }); // Wider initial size for two-column layout
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const minWidth = 700; // Wider minimum width for two-column layout
  const minHeight = 600; // Minimum height

  // Enhanced load layout handler with better validation
  const handleLoadLayout = (layoutColumns: Column[]) => {
    if (!Array.isArray(layoutColumns)) {
      console.error('❌ Invalid layout columns - not an array:', layoutColumns);
      return;
    }

    if (layoutColumns.length === 0) {
      return;
    }

    // Validate column structure
    const validColumns = layoutColumns.filter(col => 
      col && 
      typeof col === 'object' && 
      col.id && 
      col.name && 
      col.key
    );

    if (validColumns.length !== layoutColumns.length) {
    }

    onLoadLayout(validColumns);
  };

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isResizing) return;
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // Resize functionality
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y))
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(minWidth, resizeStart.width + deltaX);
        const newHeight = Math.max(minHeight, resizeStart.height + deltaY);
        
        setSize({
          width: Math.min(newWidth, window.innerWidth - position.x),
          height: Math.min(newHeight, window.innerHeight - position.y)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, size, position]);

  // Reset position when opening
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 100, y: 100 });
      setSize({ width: 800, height: 600 }); // Wider default size
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dialogRef}
      className="fixed z-50 select-none bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      <div className="flex flex-col h-full">
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Layout</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 p-4 overflow-hidden">
          {/* Two-column layout */}
          <div className="flex h-full gap-6">
            {/* Left Column: Saved Layouts */}
            <div className="flex-1 flex flex-col min-w-0">
              <LayoutManager
                columns={columns}
                savedLayouts={savedLayouts}
                loading={loading}
                onSaveLayout={saveLayout}
                onUpdateLayout={updateLayout}
                onRenameLayout={renameLayout}
                onDeleteLayout={deleteLayout}
                onLoadLayout={handleLoadLayout}
                canEditLayout={canEditLayout}
              />
            </div>

            {/* Right Column: Add Column & Column Management */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <div className="flex flex-col h-full space-y-2">
                {/* Add Column Section - Fixed height */}
                <div className="flex-shrink-0">
                  <ColumnEditor onAddColumn={onAddColumn} />
                </div>

                {/* Column List Section - Flexible height to match left side */}
                <div className="flex-1 min-h-0">
                  <ColumnList
                    columns={columns}
                    onReorderColumns={onReorderColumns}
                    onToggleColumnVisibility={onToggleColumnVisibility}
                    onDeleteColumn={onDeleteColumn}
                    onRenameColumn={onRenameColumn}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-600">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 dark:bg-gray-600 opacity-50 hover:opacity-100 transition-opacity"
          style={{
            clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
          }}
          onMouseDown={handleResizeStart}
        />
      </div>
    </div>
  );
};

export default ColumnManager;
