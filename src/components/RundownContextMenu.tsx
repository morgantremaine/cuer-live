
import React from 'react';
import { Trash2, Copy, Anchor, Palette, ClipboardPaste, X } from 'lucide-react';
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
}

const RundownContextMenu = ({
  children,
  selectedCount,
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
  onClearSelection
}: RundownContextMenuProps) => {
  const isMultipleSelection = selectedCount > 1;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
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
        
        <ContextMenuItem onClick={onToggleFloat}>
          <Anchor className="mr-2 h-4 w-4" />
          {isFloated ? 
            (isMultipleSelection ? `Unfloat ${selectedCount} rows` : 'Unfloat row') :
            (isMultipleSelection ? `Float ${selectedCount} rows` : 'Float row')
          }
        </ContextMenuItem>
        
        <div className="relative">
          <ContextMenuItem onClick={onColorPicker}>
            <Palette className="mr-2 h-4 w-4" />
            {isMultipleSelection ? `Color ${selectedCount} rows` : 'Color row'}
          </ContextMenuItem>
          
          <ColorPicker
            itemId={itemId}
            showColorPicker={showColorPicker}
            onToggle={onColorPicker}
            onColorSelect={onColorSelect}
          />
        </div>
        
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
    </ContextMenu>
  );
};

export default RundownContextMenu;
