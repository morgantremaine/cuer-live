
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  MoreVertical, 
  Edit2, 
  Copy, 
  Trash2, 
  Check, 
  X,
  Filter,
  List
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface BlueprintListHeaderProps {
  listName: string;
  sourceColumn: string;
  itemCount: number;
  uniqueItemCount?: number;
  showUniqueOnly?: boolean;
  onRename: (newName: string) => void;
  onCopy: () => void;
  onDelete: () => void;
  onToggleUnique?: (showUnique: boolean) => void;
}

const BlueprintListHeader = ({ 
  listName, 
  sourceColumn, 
  itemCount,
  uniqueItemCount,
  showUniqueOnly = false,
  onRename, 
  onCopy, 
  onDelete,
  onToggleUnique
}: BlueprintListHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(listName);

  const handleRename = () => {
    if (editValue.trim() && editValue !== listName) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(listName);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayCount = showUniqueOnly && uniqueItemCount !== undefined ? uniqueItemCount : itemCount;
  const countLabel = showUniqueOnly && uniqueItemCount !== undefined && uniqueItemCount !== itemCount 
    ? `${uniqueItemCount} unique of ${itemCount}` 
    : `${itemCount} items`;

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex-1 min-w-0 pr-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyPress}
              className="text-base"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleRename}
              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div>
            <h3 className="font-medium text-base truncate">{listName}</h3>
            <p className="text-muted-foreground text-xs">
              {countLabel}
            </p>
            
            {/* Unique Toggle */}
            {onToggleUnique && uniqueItemCount !== undefined && uniqueItemCount !== itemCount && (
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  checked={showUniqueOnly}
                  onCheckedChange={onToggleUnique}
                  className="data-[state=checked]:bg-primary"
                />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {showUniqueOnly ? <Filter className="h-3 w-3" /> : <List className="h-3 w-3" />}
                  <span>{showUniqueOnly ? 'Unique only' : 'Show all'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onCopy}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default BlueprintListHeader;
