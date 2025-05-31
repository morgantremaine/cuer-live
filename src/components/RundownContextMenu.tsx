
import React from 'react';
import { Trash2, Copy, Anchor, Palette } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface RundownContextMenuProps {
  children: React.ReactNode;
  selectedCount: number;
  isFloated?: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onToggleFloat: () => void;
  onColorPicker: () => void;
}

const RundownContextMenu = ({
  children,
  selectedCount,
  isFloated = false,
  onCopy,
  onDelete,
  onToggleFloat,
  onColorPicker
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
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={onToggleFloat}>
          <Anchor className="mr-2 h-4 w-4" />
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
        
        <ContextMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          {isMultipleSelection ? `Delete ${selectedCount} rows` : 'Delete row'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default RundownContextMenu;
