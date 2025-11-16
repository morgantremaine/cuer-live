
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { useToast } from '@/hooks/use-toast';
import { getUniqueItems, getItemMetadata } from '@/utils/blueprintUtils';
import { logger } from '@/utils/logger';
import BlueprintListHeader from './listCard/BlueprintListHeader';
import BlueprintListItem from './listCard/BlueprintListItem';

interface BlueprintListCardProps {
  list: BlueprintList;
  rundownItems: RundownItem[];
  onDelete: (listId: string) => void;
  onRename: (listId: string, newName: string) => void;
  onUpdateCheckedItems: (listId: string, checkedItems: Record<string, boolean>) => void;
  onToggleUnique?: (listId: string, showUnique: boolean) => void;
  onToggleItemNumber?: (listId: string, show: boolean) => void;
  onToggleStartTime?: (listId: string, show: boolean) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, listId: string) => void;
  onDragEnterContainer?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
  index: number;
}

const BlueprintListCard = ({ 
  list, 
  rundownItems,
  onDelete, 
  onRename,
  onUpdateCheckedItems,
  onToggleUnique,
  onToggleItemNumber,
  onToggleStartTime,
  isDragging = false,
  onDragStart,
  onDragEnterContainer,
  onDragEnd,
  index
}: BlueprintListCardProps) => {
  const { toast } = useToast();

  // Calculate unique items and their count
  const uniqueItems = getUniqueItems(list.items);
  const itemsToDisplay = list.showUniqueOnly ? uniqueItems : list.items;

  const handleCheckboxChange = (itemIndex: number, checked: boolean) => {
    logger.blueprint('BlueprintListCard: checkbox change for item', { itemIndex, checked });
    logger.blueprint('BlueprintListCard: current list checkedItems before update:', list.checkedItems);
    
    const updatedCheckedItems = {
      ...list.checkedItems,
      [itemIndex]: checked
    };
    
    logger.blueprint('BlueprintListCard: calling onUpdateCheckedItems with:', updatedCheckedItems);
    logger.blueprint('BlueprintListCard: list ID:', list.id);
    onUpdateCheckedItems(list.id, updatedCheckedItems);
  };

  const copyToClipboard = async () => {
    const text = itemsToDisplay.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard!",
        description: `${list.name} has been copied to your clipboard.`,
        variant: "default"
      });
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Copied to clipboard!",
        description: `${list.name} has been copied to your clipboard.`,
        variant: "default"
      });
    }
  };

  const getItemInfo = (itemText: string) => {
    if (!list.showItemNumber && !list.showStartTime) {
      return { itemNumber: null, startTime: null };
    }
    
    const metadata = getItemMetadata(itemText, list.sourceColumn, rundownItems);
    
    console.log('BLUEPRINT DEBUG - getItemInfo:', {
      itemText,
      sourceColumn: list.sourceColumn,
      showItemNumber: list.showItemNumber,
      showStartTime: list.showStartTime,
      metadata
    });
    
    return {
      itemNumber: list.showItemNumber ? metadata.rowNumber : null,
      startTime: list.showStartTime ? metadata.startTime : null,
    };
  };

  const handleToggleUnique = (showUnique: boolean) => {
    if (onToggleUnique) {
      onToggleUnique(list.id, showUnique);
    }
  };

  const handleToggleItemNumber = (show: boolean) => {
    if (onToggleItemNumber) {
      onToggleItemNumber(list.id, show);
    }
  };

  const handleToggleStartTime = (show: boolean) => {
    if (onToggleStartTime) {
      onToggleStartTime(list.id, show);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, list.id);
    }
  };

  // Enhanced logging for debugging checkbox state
  logger.blueprint('BlueprintListCard: rendering list', { 
    name: list.name, 
    checkedItems: list.checkedItems 
  });

  return (
    <Card 
      className={`h-fit bg-gray-800 border-gray-700 transition-all duration-200 cursor-move ${
        isDragging ? 'opacity-50 transform rotate-2' : ''
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnter={(e) => onDragEnterContainer?.(e, index)}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          {/* Drag Handle - positioned on the left like other components */}
          <div className="p-1 rounded flex-shrink-0 mt-1">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          
          {/* List Header - takes up remaining space */}
          <div className="flex-1 min-w-0">
            <BlueprintListHeader
              listName={list.name}
              sourceColumn={list.sourceColumn}
              itemCount={list.items.length}
              uniqueItemCount={uniqueItems.length}
              showUniqueOnly={list.showUniqueOnly}
              showItemNumber={list.showItemNumber}
              showStartTime={list.showStartTime}
              onRename={(newName) => onRename(list.id, newName)}
              onCopy={copyToClipboard}
              onDelete={() => onDelete(list.id)}
              onToggleUnique={uniqueItems.length !== list.items.length ? handleToggleUnique : undefined}
              onToggleItemNumber={handleToggleItemNumber}
              onToggleStartTime={handleToggleStartTime}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {itemsToDisplay.length === 0 ? (
            <p className="text-gray-500 italic">No items found</p>
          ) : (
            itemsToDisplay.map((item, itemIndex) => {
              const { itemNumber, startTime } = getItemInfo(item);
              // For unique mode, use the original index for checkbox state
              const originalIndex = list.showUniqueOnly ? list.items.indexOf(item) : itemIndex;
              const isChecked = list.checkedItems?.[originalIndex] || false;
              
              logger.blueprint(`BlueprintListCard: item ${itemIndex} "${item}" isChecked:`, isChecked);
              
              return (
                <BlueprintListItem
                  key={`${item}-${itemIndex}`}
                  item={item}
                  index={originalIndex}
                  isChecked={isChecked}
                  itemNumber={itemNumber}
                  startTime={startTime}
                  onCheckboxChange={handleCheckboxChange}
                />
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BlueprintListCard;
