
import React from 'react';

interface UseRowEventHandlersProps {
  item: { id: string; type?: string };
  index: number;
  isSelected?: boolean;
  selectedRowsCount?: number;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => void;
  onDeleteRow: (id: string) => void;
  onDeleteSelectedRows: () => void;
  onCopySelectedRows: () => void;
  onToggleColorPicker: (itemId: string) => void;
  onToggleFloat?: (id: string) => void;
  selectedRows?: Set<string>;
  onPasteRows?: (targetRowId?: string) => void;
  onClearSelection?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  // Header collapse props
  isHeaderCollapsed?: (headerId: string) => boolean;
  getHeaderGroupItemIds?: (headerId: string) => string[];
}

export const useRowEventHandlers = ({
  item,
  index,
  isSelected = false,
  selectedRowsCount = 1,
  onRowSelect,
  onDeleteRow,
  onDeleteSelectedRows,
  onCopySelectedRows,
  onToggleColorPicker,
  onToggleFloat,
  selectedRows,
  onPasteRows,
  onClearSelection,
  onJumpToHere,
  isHeaderCollapsed,
  getHeaderGroupItemIds
}: UseRowEventHandlersProps) => {
  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const isResizeHandle = target.classList.contains('resize-handle') || target.closest('.resize-handle');
    
    if (isInput || isResizeHandle) {
      return;
    }
    
    e.stopPropagation();
    
    if (onRowSelect) {
      // Check if this is a collapsed header and get its group items
      let headerGroupItemIds: string[] | undefined;
      if (item.type === 'header' && isHeaderCollapsed && getHeaderGroupItemIds) {
        const isCollapsed = isHeaderCollapsed(item.id);
        if (isCollapsed) {
          headerGroupItemIds = getHeaderGroupItemIds(item.id);
        }
      }
      
      onRowSelect(item.id, index, e.shiftKey, e.ctrlKey || e.metaKey, headerGroupItemIds);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Only allow browser context menu if user is actively editing text (focused input/textarea)
    const activeElement = document.activeElement as HTMLElement;
    const isActivelyEditing = activeElement && 
                             (activeElement.tagName === 'INPUT' || 
                              activeElement.tagName === 'TEXTAREA' || 
                              activeElement.isContentEditable) &&
                             target === activeElement;
    
    if (isActivelyEditing) {
      // Don't prevent default, don't select row - let browser handle it
      return;
    }
    
    // Select the row if not already selected (let the custom context menu handle the rest)
    if (onRowSelect && !isSelected) {
      onRowSelect(item.id, index, false, false);
    }
  };

  const handleContextMenuCopy = () => {
    onCopySelectedRows();
  };

  const handleContextMenuDelete = () => {
    if (isSelected && selectedRowsCount > 1) {
      onDeleteSelectedRows();
    } else {
      onDeleteRow(item.id);
    }
  };

  const handleContextMenuFloat = () => {
    if (onToggleFloat) {
      if (isSelected && selectedRowsCount > 1 && selectedRows) {
        selectedRows.forEach(selectedId => {
          onToggleFloat(selectedId);
        });
      } else {
        onToggleFloat(item.id);
      }
      
      // Clear selection after floating
      if (onClearSelection) {
        onClearSelection();
      }
    }
  };

  const handleContextMenuColor = () => {
    onToggleColorPicker(item.id);
  };

  const handleContextMenuPaste = () => {
    if (onPasteRows) {
      // Pass the current item's ID as the target for pasting
      onPasteRows(item.id);
    }
  };

  const handleJumpToHere = () => {
    if (onJumpToHere) {
      onJumpToHere(item.id);
    }
  };

  return {
    handleRowClick,
    handleContextMenu,
    handleContextMenuCopy,
    handleContextMenuDelete,
    handleContextMenuFloat,
    handleContextMenuColor,
    handleContextMenuPaste,
    handleJumpToHere
  };
};
