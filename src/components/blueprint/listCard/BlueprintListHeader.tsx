
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
  List,
  Hash,
  Clock
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
  showItemNumber?: boolean;
  showStartTime?: boolean;
  onRename: (newName: string) => void;
  onCopy: () => void;
  onDelete: () => void;
  onToggleUnique?: (showUnique: boolean) => void;
  onToggleItemNumber?: (show: boolean) => void;
  onToggleStartTime?: (show: boolean) => void;
}

const BlueprintListHeader = ({ 
  listName, 
  sourceColumn, 
  itemCount,
  uniqueItemCount,
  showUniqueOnly = false,
  showItemNumber = false,
  showStartTime = false,
  onRename, 
  onCopy, 
  onDelete,
  onToggleUnique,
  onToggleItemNumber,
  onToggleStartTime
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
              className="text-base bg-gray-700 border-gray-600 text-white"
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
              className="h-6 w-6 p-0 border-gray-600 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div>
            <h3 className="text-white font-medium text-base truncate">{listName}</h3>
            <p className="text-gray-400 text-xs">
              {countLabel}
            </p>
            
            {/* Display Options Toggles */}
            <div className="space-y-2 mt-2">
              {/* Unique Toggle */}
              {onToggleUnique && uniqueItemCount !== undefined && uniqueItemCount !== itemCount && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showUniqueOnly}
                    onCheckedChange={onToggleUnique}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    {showUniqueOnly ? <Filter className="h-3 w-3" /> : <List className="h-3 w-3" />}
                    <span>{showUniqueOnly ? 'Unique only' : 'Show all'}</span>
                  </div>
                </div>
              )}
              
              {/* Item Number Toggle */}
              {onToggleItemNumber && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showItemNumber}
                    onCheckedChange={onToggleItemNumber}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Hash className="h-3 w-3" />
                    <span>Show Row #</span>
                  </div>
                </div>
              )}
              
              {/* Start Time Toggle */}
              {onToggleStartTime && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showStartTime}
                    onCheckedChange={onToggleStartTime}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>Show Time</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 w-6 p-0 flex-shrink-0"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
          <DropdownMenuItem 
            onClick={() => setIsEditing(true)}
            className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onCopy}
            className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem 
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/50 cursor-pointer"
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
