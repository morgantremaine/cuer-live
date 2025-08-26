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
  onToggleColumnVisibility: (columnId: string) => void;
}

const HeaderContextMenu = ({ 
  children, 
  column, 
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
                    onClick={() => onToggleColumnVisibility(hiddenColumn.id)}
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