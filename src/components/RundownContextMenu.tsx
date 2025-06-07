
import React, { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Copy, Trash2, Palette, Pin, PinOff, Clipboard, Plus, Hash, X } from 'lucide-react';
import ColorPicker from './ColorPicker';

interface RundownContextMenuProps {
  children: ReactNode;
  selectedCount: number;
  selectedRows?: Set<string>;
  isFloated?: boolean;
  hasClipboardData?: boolean;
  showColorPicker?: string | null;
  itemId?: string;
  onCopy: () => void;
  onDelete: () => void;
  onToggleFloat: () => void;
  onColorPicker: () => void;
  onColorSelect?: (itemId: string, color: string) => void;
  onPaste?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
}

const RundownContextMenu = ({
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
  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // If right-clicking inside an input/textarea, don't show custom context menu
    if (isInput) {
      e.stopPropagation();
      return false; // This prevents the ContextMenu from opening
    }
    
    return true; // Allow the ContextMenu to open
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger 
        asChild 
        onContextMenu={handleContextMenu}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {selectedCount > 1 && (
          <>
            <ContextMenuItem onClick={onClearSelection} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Clear Selection ({selectedCount} selected)
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        
        <ContextMenuItem onClick={onCopy} className="flex items-center gap-2">
          <Copy className="h-4 w-4" />
          Copy {selectedCount > 1 ? `${selectedCount} rows` : 'row'}
        </ContextMenuItem>
        
        {hasClipboardData && onPaste && (
          <ContextMenuItem onClick={onPaste} className="flex items-center gap-2">
            <Clipboard className="h-4 w-4" />
            Paste rows
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={onDelete} className="flex items-center gap-2 text-red-600">
          <Trash2 className="h-4 w-4" />
          Delete {selectedCount > 1 ? `${selectedCount} rows` : 'row'}
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={onToggleFloat} className="flex items-center gap-2">
          {isFloated ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          {isFloated ? 'Unfloat' : 'Float'} {selectedCount > 1 ? `${selectedCount} rows` : 'row'}
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onColorPicker} className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Color row
        </ContextMenuItem>
        
        {showColorPicker && itemId && onColorSelect && (
          <div className="p-2">
            <ColorPicker
              onColorSelect={(color) => onColorSelect(itemId, color)}
              onClose={() => {}}
            />
          </div>
        )}
        
        <ContextMenuSeparator />
        
        {onAddRow && (
          <ContextMenuItem onClick={onAddRow} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Row
          </ContextMenuItem>
        )}
        
        {onAddHeader && (
          <ContextMenuItem onClick={onAddHeader} className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Add Header
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default RundownContextMenu;
