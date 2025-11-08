import React, { useMemo } from 'react';
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
import { Column } from '@/types/columns';
import { useTeamCustomColumns } from '@/hooks/useTeamCustomColumns';
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
  const { teamColumns } = useTeamCustomColumns();

  // Get all possible columns (built-in + team custom + any existing custom)
  const allPossibleColumns = useMemo(() => {
    // Default built-in columns
    const defaultColumns: Column[] = [
      { id: 'name', name: 'Segment Name', key: 'name', width: '200px', isCustom: false, isEditable: true, isVisible: true },
      { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true },
      { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
      { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
      { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
      { id: 'images', name: 'Images', key: 'images', width: '150px', isCustom: false, isEditable: true, isVisible: true },
      { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
      { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
      { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
      { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
      { id: 'backTime', name: 'Back', key: 'backTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
      { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
    ];

    // Add team custom columns
    const teamCustomColumns: Column[] = teamColumns.map(teamCol => ({
      id: teamCol.column_key,
      name: teamCol.column_name,
      key: teamCol.column_key,
      width: '150px',
      isCustom: true,
      isEditable: true,
      isVisible: true // Will be filtered out if currently visible
    }));

    // Combine all possible columns
    const allPossible = [...defaultColumns, ...teamCustomColumns];
    
    // Add any existing custom columns from allColumns that aren't team columns
    allColumns.forEach(existingCol => {
      if (existingCol.isCustom && !teamColumns.some(tc => tc.column_key === existingCol.key)) {
        // This is a user custom column not in team columns
        const exists = allPossible.some(col => col.id === existingCol.id);
        if (!exists) {
          allPossible.push(existingCol);
        }
      }
    });

    return allPossible;
  }, [teamColumns, allColumns]);

  // Get columns that are not currently visible in the layout
  const hiddenColumns = useMemo(() => {
    const visibleColumnKeys = new Set(visibleColumns.map(col => col.key));
    return allPossibleColumns.filter(col => !visibleColumnKeys.has(col.key));
  }, [allPossibleColumns, visibleColumns]);

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