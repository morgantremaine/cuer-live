
import React, { memo, useRef } from 'react';
import { Trash2, Copy, Palette, ClipboardPaste, X, Plus } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import ColorPicker from './ColorPicker';

interface RundownContextMenuProps {
  children: React.ReactNode;
  selectedCount: number;
  selectedRows?: Set<string>;
  isFloated?: boolean;
  hasClipboardData?: boolean;
  showColorPicker?: string | null;
  itemId: string;
  onCopy: () => void;
  onDelete: () => void;
  onToggleFloat: () => void;
  onColorPicker: () => void;
  onColorSelect: (itemId: string, color: string) => void;
  onPaste?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
}

const RundownContextMenu = memo(({
  children,
  selectedCount,
  selectedRows,
  isFloated = false,
  hasClipboardData = false,
  showColorPicker,
  itemId,
  onCopy,
  onDelete,
  onToggleFloat,
  onColorPicker,
  onColorSelect,
  onPaste,
  onClearSelection,
  onAddRow,
  onAddHeader
}: RundownContextMenuProps) => {
  const isMultipleSelection = selectedCount > 1;
  const contextMenuContentRef = useRef<HTMLDivElement>(null);

  // Handle color selection for multiple rows
  const handleColorSelect = (id: string, color: string) => {
    if (isMultipleSelection && selectedRows) {
      // Apply color to all selected rows
      selectedRows.forEach(selectedId => {
        onColorSelect(selectedId, color);
      });
    } else {
      // Apply color to single row
      onColorSelect(id, color);
    }
    
    // Close the color picker after selection
    onColorPicker();
    
    // Close the context menu by simulating escape key
    if (contextMenuContentRef.current) {
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true
      });
      contextMenuContentRef.current.dispatchEvent(escapeEvent);
    }
  };

  // Handle float toggle for multiple rows
  const handleContextMenuFloat = () => {
    if (isMultipleSelection && selectedRows) {
      // Toggle float for all selected rows
      selectedRows.forEach(selectedId => {
        onToggleFloat();
      });
    } else {
      // Toggle float for single row
      onToggleFloat();
    }
  };

  // Handle color picker with context menu closure
  const handleColorPickerClick = () => {
    onColorPicker();
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent 
          ref={contextMenuContentRef}
          className="w-48 z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg"
        >
          {onAddRow && (
            <ContextMenuItem 
              onClick={onAddRow} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Segment
            </ContextMenuItem>
          )}
          
          {onAddHeader && (
            <ContextMenuItem 
              onClick={onAddHeader} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Header
            </ContextMenuItem>
          )}
          
          {(onAddRow || onAddHeader) && <ContextMenuSeparator />}
          
          <ContextMenuItem 
            onClick={onCopy} 
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Copy className="mr-2 h-4 w-4" />
            {isMultipleSelection ? `Copy ${selectedCount} rows` : 'Copy row'}
          </ContextMenuItem>
          
          {hasClipboardData && onPaste && (
            <ContextMenuItem 
              onClick={onPaste} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Paste rows
            </ContextMenuItem>
          )}
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={handleContextMenuFloat} 
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="mr-2 h-4 w-4 flex items-center justify-center">🛟</span>
            {isFloated ? 
              (isMultipleSelection ? `Unfloat ${selectedCount} rows` : 'Unfloat row') :
              (isMultipleSelection ? `Float ${selectedCount} rows` : 'Float row')
            }
          </ContextMenuItem>
          
          <ContextMenuItem 
            onClick={handleColorPickerClick} 
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Palette className="mr-2 h-4 w-4" />
            {isMultipleSelection ? `Color ${selectedCount} rows` : 'Color row'}
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          {isMultipleSelection && onClearSelection && (
            <ContextMenuItem 
              onClick={onClearSelection} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="mr-2 h-4 w-4" />
              Clear selection
            </ContextMenuItem>
          )}
          
          <ContextMenuItem 
            onClick={onDelete} 
            className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isMultipleSelection ? `Delete ${selectedCount} rows` : 'Delete row'}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Color picker positioned outside the context menu */}
      {showColorPicker === itemId && (
        <div className="fixed z-[10000]" style={{ 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)'
        }}>
          <ColorPicker
            itemId={itemId}
            showColorPicker={showColorPicker}
            onToggle={onColorPicker}
            onColorSelect={handleColorSelect}
          />
        </div>
      )}
    </>
  );
});

RundownContextMenu.displayName = 'RundownContextMenu';

export default RundownContextMenu;
