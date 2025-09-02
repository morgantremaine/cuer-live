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
import { Eye, EyeOff, Plus, FolderOpen } from 'lucide-react';

interface LayoutData {
  id: string;
  name: string;
  columns: Column[];
  is_default?: boolean;
  creator_profile?: {
    full_name: string | null;
    email: string;
  };
}

interface HeaderContextMenuProps {
  children: React.ReactNode;
  column: Column;
  allColumns: Column[];
  visibleColumns: Column[];
  columnIndex: number;
  onToggleColumnVisibility: (columnId: string, insertIndex?: number) => void;
  savedLayouts?: LayoutData[];
  onLoadLayout?: (columns: Column[]) => void;
}

const HeaderContextMenu = ({ 
  children, 
  column, 
  allColumns,
  visibleColumns,
  columnIndex,
  onToggleColumnVisibility,
  savedLayouts = [],
  onLoadLayout
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

  const handleLoadLayout = (layout: LayoutData) => {
    if (onLoadLayout && Array.isArray(layout.columns)) {
      onLoadLayout(layout.columns);
    }
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

        {savedLayouts.length > 0 && onLoadLayout && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Load Layout
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56">
                {savedLayouts.map((layout) => (
                  <ContextMenuItem
                    key={layout.id}
                    onClick={() => handleLoadLayout(layout)}
                    className="flex items-center gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {layout.name}
                      </div>
                      {layout.creator_profile && (
                        <div className="text-xs text-muted-foreground truncate">
                          by {layout.creator_profile.full_name || layout.creator_profile.email}
                        </div>
                      )}
                    </div>
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