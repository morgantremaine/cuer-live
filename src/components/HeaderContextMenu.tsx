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
  columnIndex: number;
  allColumns: Column[];
  onToggleColumnVisibility: (columnId: string, insertIndex?: number) => void;
}

const HeaderContextMenu = ({ 
  children, 
  column, 
  columnIndex,
  allColumns, 
  onToggleColumnVisibility 
}: HeaderContextMenuProps) => {
  const hiddenColumns = allColumns.filter(col => col.isVisible === false);

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
                    onClick={() => onToggleColumnVisibility(hiddenColumn.id, columnIndex + 1)}
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