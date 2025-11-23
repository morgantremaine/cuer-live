
import React, { memo } from 'react';
import { Trash2, Copy, Palette, ClipboardPaste, X, Plus, Navigation, LifeBuoy, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { useResponsiveLayout } from '@/hooks/use-mobile';
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


interface RundownContextMenuProps {
  children: React.ReactNode;
  selectedCount: number;
  selectedRows?: Set<string>;
  isFloated?: boolean;
  hasClipboardData?: boolean;
  showColorPicker?: string | null;
  itemId: string;
  itemType?: 'regular' | 'header';
  onCopy: () => void;
  onDelete: () => void;
  onToggleFloat: () => void;
  onColorPicker: () => void;
  onColorSelect: (itemId: string, color: string) => void;
  onCloseColorPicker?: () => void;
  onPaste?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  onAutoTimeToScript?: () => void;
  onAutoTimeToScriptMultiple?: (selectedRows: Set<string>) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  scriptText?: string;
  allItems?: any[];
  userRole?: string | null;
}

const RundownContextMenu = memo(({
  children,
  selectedCount,
  selectedRows,
  isFloated = false,
  hasClipboardData = false,
  showColorPicker,
  itemId,
  itemType = 'regular',
  onCopy,
  onDelete,
  onToggleFloat,
  onColorPicker,
  onColorSelect,
  onCloseColorPicker,
  onPaste,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onJumpToHere,
  onAutoTimeToScript,
  onAutoTimeToScriptMultiple,
  onMoveUp,
  onMoveDown,
  scriptText,
  allItems,
  userRole
}: RundownContextMenuProps) => {
  const { isMobile } = useResponsiveLayout();
  const isMultipleSelection = selectedCount > 1;
  const canUseShowcaller = userRole === 'admin' || userRole === 'manager' || userRole === 'showcaller';

  
  // Define color options for the submenu (same as original ColorPicker)
  const colorOptions = [
    { name: 'Default', value: '' },
    { name: 'Red', value: '#fca5a5' },
    { name: 'Orange', value: '#fdba74' },
    { name: 'Yellow', value: '#fde047' },
    { name: 'Green', value: '#86efac' },
    { name: 'Blue', value: '#93c5fd' },
    { name: 'Purple', value: '#c4b5fd' },
    { name: 'Pink', value: '#f9a8d4' },
    { name: 'Gray', value: '#d1d5db' }
  ];

  // Handle color selection for multiple rows
  const handleColorSelect = (id: string, color: string) => {
    if (isMultipleSelection && selectedRows) {
      // Apply color to all selected rows
      selectedRows.forEach(selectedId => {
        onColorSelect(selectedId, color);
      });
    } else {
      // Apply color to single row
      onColorSelect(id, color);
    }
    
    // Always close the color picker after selection
    if (onCloseColorPicker) {
      onCloseColorPicker();
    }
    
    // Clear selection after color selection
    if (onClearSelection) {
      onClearSelection();
    }

  };

  // Handle float toggle for multiple rows
  const handleContextMenuFloat = () => {
    if (isMultipleSelection && selectedRows) {
      // Toggle float for all selected rows
      selectedRows.forEach(selectedId => {
        onToggleFloat();
      });
    } else {
      // Toggle float for single row
      onToggleFloat();
    }
  };

  const handleJumpToHere = () => {
    if (onJumpToHere && itemType === 'regular') {
      onJumpToHere(itemId);
    }
  };

  // Handle add row and clear selection
  const handleAddRow = () => {
    if (onAddRow) {
      onAddRow();
    }
    // Clear selection after adding row
    if (onClearSelection) {
      onClearSelection();
    }
  };

  // Handle add header and clear selection
  const handleAddHeader = () => {
    if (onAddHeader) {
      onAddHeader();
    }
    // Clear selection after adding header
    if (onClearSelection) {
      onClearSelection();
    }
  };

  // Handle auto time to script
  const handleAutoTimeToScript = () => {
    if (isMultipleSelection && selectedRows && onAutoTimeToScriptMultiple) {
      onAutoTimeToScriptMultiple(selectedRows);
    } else if (onAutoTimeToScript) {
      onAutoTimeToScript();
    }
  };

  // Calculate if Auto Time to Script should be shown
  const showAutoTimeToScript = itemType === 'regular' && (
    (isMultipleSelection && selectedRows && allItems && 
     Array.from(selectedRows).some(id => {
       const item = allItems.find(item => item.id === id);
       return item && item.script && item.script.trim().length > 0;
     })
    ) ||
    (!isMultipleSelection && scriptText && scriptText.trim().length > 0)
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger 
          asChild 
          disabled={(() => {
            // Only disable if there's selected text in an editable element
            const selection = window.getSelection();
            const hasTextSelection = selection && selection.toString().length > 0;
            
            if (hasTextSelection) {
              const activeElement = document.activeElement as HTMLElement;
              return activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.isContentEditable
              );
            }
            
            // Never disable for non-editable areas or when no text is selected
            return false;
          })()}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48 z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg">
          {onAddRow && (
            <ContextMenuItem 
              onClick={handleAddRow} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isMultipleSelection ? `Add ${selectedCount} segments` : 'Segment'}
            </ContextMenuItem>
          )}
          
          {onAddHeader && (
            <ContextMenuItem 
              onClick={handleAddHeader} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Header
            </ContextMenuItem>
          )}
          
          {(onAddRow || onAddHeader) && <ContextMenuSeparator />}
          
          {/* Jump to here - only show for regular segments, single selection, and showcaller roles */}
          {onJumpToHere && itemType === 'regular' && !isMultipleSelection && canUseShowcaller && (
            <>
              <ContextMenuItem 
                onClick={handleJumpToHere} 
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Navigation className="mr-2 h-4 w-4" />
                Jump to here
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          
          <ContextMenuItem 
            onClick={onCopy} 
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Copy className="mr-2 h-4 w-4" />
            {isMultipleSelection ? `Copy ${selectedCount} rows` : 'Copy row'}
          </ContextMenuItem>
          
          {hasClipboardData && onPaste && (
            <ContextMenuItem 
              onClick={onPaste} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Paste rows
            </ContextMenuItem>
          )}
          
          {/* Auto Time to Script - show for regular segments with script content */}
          {showAutoTimeToScript && (
            <ContextMenuItem 
              onClick={handleAutoTimeToScript} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Clock className="mr-2 h-4 w-4" />
              {isMultipleSelection ? `Auto Time to Script (${selectedCount} rows)` : 'Auto Time to Script'}
            </ContextMenuItem>
          )}
          
          <ContextMenuSeparator />
          
          {/* Float option - only show for regular segments */}
          {itemType === 'regular' && (
            <ContextMenuItem 
              onClick={handleContextMenuFloat} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LifeBuoy className="mr-2 h-4 w-4" />
              {isFloated ? 
                (isMultipleSelection ? `Unfloat ${selectedCount} rows` : 'Unfloat row') :
                (isMultipleSelection ? `Float ${selectedCount} rows` : 'Float row')
              }
            </ContextMenuItem>
          )}
          
          
          {/* Mobile-only move up/down buttons */}
          {isMobile && (onMoveUp || onMoveDown) && (
            <>
              <ContextMenuSeparator />
              {onMoveUp && (
                <ContextMenuItem 
                  onClick={onMoveUp} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Move up
                </ContextMenuItem>
              )}
              {onMoveDown && (
                <ContextMenuItem 
                  onClick={onMoveDown} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Move down
                </ContextMenuItem>
              )}
            </>
          )}
          
          <ContextMenuSub>
            <ContextMenuSubTrigger className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
              <Palette className="mr-2 h-4 w-4" />
              {isMultipleSelection ? `Color ${selectedCount} rows` : 'Color row'}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-auto min-w-0 p-2">
              <div className="grid grid-cols-3 gap-2">
                {colorOptions.map((color) => (
                  <ContextMenuItem
                    key={color.name}
                    onSelect={() => handleColorSelect(itemId, color.value)}
                    className="p-1 flex items-center justify-center"
                  >
                    <div 
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-500"
                      style={{ backgroundColor: color.value || '#ffffff' }}
                      title={color.name}
                    />
                  </ContextMenuItem>
                ))}
              </div>
            </ContextMenuSubContent>
          </ContextMenuSub>
          
          <ContextMenuSeparator />
          
          {isMultipleSelection && onClearSelection && (
            <ContextMenuItem 
              onClick={onClearSelection} 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="mr-2 h-4 w-4" />
              Clear selection
            </ContextMenuItem>
          )}
          
          <ContextMenuItem 
            onClick={onDelete} 
            className="text-red-600 focus:text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isMultipleSelection ? `Delete ${selectedCount} rows` : 'Delete row'}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
});

RundownContextMenu.displayName = 'RundownContextMenu';

export default RundownContextMenu;
