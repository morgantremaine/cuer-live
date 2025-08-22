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
} from '@/components/ui/context-menu';
import { EyeOff, Plus, Layout } from 'lucide-react';
import { Column } from '@/hooks/useColumnsManager';

interface ColumnLayout {
  id: string;
  name: string;
  columns: any[];
  is_default: boolean;
  user_id: string;
  team_id?: string;
  creator_profile?: {
    full_name: string | null;
    email: string;
  };
}

interface ColumnHeaderContextMenuProps {
  children: React.ReactNode;
  column: Column;
  availableColumns: Column[];
  savedLayouts: ColumnLayout[];
  onHideColumn: (columnId: string) => void;
  onAddColumnAfter: (column: Column, afterColumnId: string) => void;
  onLoadLayoutFromContextMenu: (layout: ColumnLayout) => void;
}

const ColumnHeaderContextMenu = ({
  children,
  column,
  availableColumns,
  savedLayouts,
  onHideColumn,
  onAddColumnAfter,
  onLoadLayoutFromContextMenu,
}: ColumnHeaderContextMenuProps) => {
  // Filter out columns that are already visible
  const hiddenColumns = availableColumns.filter(col => !col.isVisible);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <ContextMenuItem
          onClick={() => onHideColumn(column.id)}
          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
        >
          <EyeOff className="h-4 w-4" />
          Hide Column
        </ContextMenuItem>
        
        <ContextMenuSeparator className="my-1 bg-gray-200 dark:bg-gray-600" />
        
        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Plus className="h-4 w-4" />
            Add Column
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg ml-1">
            {hiddenColumns.length > 0 ? (
              hiddenColumns.map((hiddenColumn) => (
                <ContextMenuItem
                  key={hiddenColumn.id}
                  onClick={() => onAddColumnAfter(hiddenColumn, column.id)}
                  className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  {hiddenColumn.name}
                </ContextMenuItem>
              ))
            ) : (
              <ContextMenuItem disabled className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                All columns visible
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuSeparator className="my-1 bg-gray-200 dark:bg-gray-600" />
        
        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Layout className="h-4 w-4" />
            Load Layout
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg ml-1">
            {savedLayouts.length > 0 ? (
              savedLayouts.map((layout) => (
                <ContextMenuItem
                  key={layout.id}
                  onClick={() => onLoadLayoutFromContextMenu(layout)}
                  className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{layout.name}</span>
                    {layout.creator_profile && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        by {layout.creator_profile.full_name || layout.creator_profile.email}
                      </span>
                    )}
                  </div>
                </ContextMenuItem>
              ))
            ) : (
              <ContextMenuItem disabled className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No saved layouts
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ColumnHeaderContextMenu;