
import React, { memo } from 'react';
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {onAddRow && (
          <ContextMenuItem onClick={onAddRow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Segment
          </ContextMenuItem>
        )}
        
        {onAddHeader && (
          <ContextMenuItem onClick={onAddHeader}>
            <Plus className="mr-2 h-4 w-4" />
            Add Header
          </ContextMenuItem>
        )}
        
        {(onAddRow || onAddHeader) && <ContextMenuSeparator />}
        
        <ContextMenuItem onClick={onCopy}>
          <Copy className="mr-2 h-4 w-4" />
          {isMultipleSelection ? `Copy ${selectedCount} rows` : 'Copy row'}
        </ContextMenuItem>
        
        {hasClipboardData && onPaste && (
          <ContextMenuItem onClick={onPaste}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Paste rows
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={handleContextMenuFloat}>
          <span className="mr-2 h-4 w-4 flex items-center justify-center">🛟</span>
          {isFloated ? 
            (isMultipleSelection ? `Unfloat ${selectedCount} rows` : 'Unfloat row') :
            (isMultipleSelection ? `Float ${selectedCount} rows` : 'Float row')
          }
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onColorPicker}>
          <Palette className="mr-2 h-4 w-4" />
          {isMultipleSelection ? `Color ${selectedCount} rows` : 'Color row'}
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        {isMultipleSelection && onClearSelection && (
          <ContextMenuItem onClick={onClearSelection}>
            <X className="mr-2 h-4 w-4" />
            Clear selection
          </ContextMenuItem>
        )}
        
        <ContextMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          {isMultipleSelection ? `Delete ${selectedCount} rows` : 'Delete row'}
        </ContextMenuItem>
      </ContextMenuContent>
      
      {/* Color picker positioned outside the context menu */}
      {showColorPicker === itemId && (
        <div className="fixed z-50" style={{ 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)'
        }}>
          <ColorPicker
            itemId={itemId}
            showColorPicker={showColorPicker}
            onToggle={onColorPicker}
            onColorSelect={(id, color) => {
              handleColorSelect(id, color);
              onColorPicker(); // Close the color picker after selection
            }}
          />
        </div>
      )}
    </ContextMenu>
  );
});

RundownContextMenu.displayName = 'RundownContextMenu';

export default RundownContextMenu;
