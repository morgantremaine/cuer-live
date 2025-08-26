import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Column } from '@/hooks/useColumnsManager';
import { Eye, EyeOff, Plus } from 'lucide-react';

interface HeaderContextMenuProps {
  children: React.ReactNode;
  column: Column;
  allColumns: Column[];
  visibleColumns: Column[];
  columnIndex: number;
  onToggleColumnVisibility: (columnId: string, insertIndex?: number) => void;
}

const HeaderContextMenu = ({ 
  children, 
  column, 
  allColumns,
  visibleColumns,
  columnIndex,
  onToggleColumnVisibility 
}: HeaderContextMenuProps) => {
  const hiddenColumns = allColumns.filter(col => col.isVisible === false);

  // Find the position in the full columns array where we want to insert
  const getInsertPosition = () => {
    const currentColumnIndexInAll = allColumns.findIndex(col => col.id === column.id);
    // Find the next visible column after the current one
    let insertPosition = currentColumnIndexInAll + 1;
    
    // If this is the last column or there are no columns after it, insert at the end
    if (insertPosition >= allColumns.length) {
      insertPosition = allColumns.length;
    }
    
    return insertPosition;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => onToggleColumnVisibility(column.id)}
          className="flex items-center gap-2"
        >
          <EyeOff className="h-4 w-4" />
          Hide This Column
        </ContextMenuItem>
        
        {hiddenColumns.length > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Column
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {hiddenColumns.map((hiddenColumn) => (
                  <ContextMenuItem
                    key={hiddenColumn.id}
                    onClick={() => onToggleColumnVisibility(hiddenColumn.id, getInsertPosition())}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {hiddenColumn.name || hiddenColumn.key}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default HeaderContextMenu;