import React from 'react';
import { MoreHorizontal, Copy, Trash2, Clock, Droplet, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SearchButton from './search/SearchButton';

interface RundownContextMenuProps {
  children: React.ReactNode;
  selectedCount: number;
  selectedRows?: Set<string>;
  isFloated: boolean;
  hasClipboardData: boolean;
  showColorPicker: boolean;
  itemId: string;
  onCopy: () => void;
  onDelete: () => void;
  onToggleFloat: () => void;
  onColorPicker: () => void;
  onColorSelect: (itemId: string, color: string) => void;
  onPaste?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onSearchOpen?: () => void;
}

const RundownContextMenu = ({
  children,
  selectedCount,
  selectedRows,
  isFloated,
  hasClipboardData,
  showColorPicker,
  itemId,
  onCopy,
  onDelete,
  onToggleFloat,
  onColorPicker,
  onColorSelect,
  onPaste,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onSearchOpen
}: RundownContextMenuProps) => {
  const ContextMenuItem = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <DropdownMenuItem onClick={onClick} className="cursor-pointer">
      {children}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {selectedCount > 1 && selectedRows && selectedRows.size > 1 ? (
          <>
            <ContextMenuItem onClick={onCopy}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy Rows</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Rows</span>
            </ContextMenuItem>
            {onClearSelection && (
              <ContextMenuItem onClick={onClearSelection}>
                <Clock className="mr-2 h-4 w-4" />
                <span>Clear Selection</span>
              </ContextMenuItem>
            )}
          </>
        ) : (
          <>
            <ContextMenuItem onClick={onCopy}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy Row</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Row</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={onToggleFloat}>
              <Clock className="mr-2 h-4 w-4" />
              <span>{isFloated ? 'Unfloat Row' : 'Float Row'}</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={onColorPicker}>
              <Droplet className="mr-2 h-4 w-4" />
              <span>{showColorPicker ? 'Close Color' : 'Pick Color'}</span>
            </ContextMenuItem>
            {showColorPicker && (
              <div className="px-2 py-1">
                <div className="flex flex-wrap gap-1">
                  {['#fef08a', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309'].map((color) => (
                    <Button
                      key={color}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 rounded-full"
                      style={{ backgroundColor: color }}
                      onClick={() => onColorSelect(itemId, color)}
                    ></Button>
                  ))}
                </div>
              </div>
            )}
            {onPaste && hasClipboardData && (
              <ContextMenuItem onClick={onPaste}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Paste Rows</span>
              </ContextMenuItem>
            )}
            {onClearSelection && (
              <ContextMenuItem onClick={onClearSelection}>
                <Clock className="mr-2 h-4 w-4" />
                <span>Clear Selection</span>
              </ContextMenuItem>
            )}
            {onAddRow && (
              <ContextMenuItem onClick={onAddRow}>
                <MoreHorizontal className="mr-2 h-4 w-4" />
                <span>Add Row Below</span>
              </ContextMenuItem>
            )}
            {onAddHeader && (
              <ContextMenuItem onClick={onAddHeader}>
                <MoreHorizontal className="mr-2 h-4 w-4" />
                <span>Add Header Below</span>
              </ContextMenuItem>
            )}
            {onSearchOpen && (
              <ContextMenuItem onClick={onSearchOpen}>
                <Search className="mr-2 h-4 w-4" />
                <span>Search</span>
              </ContextMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RundownContextMenu;
