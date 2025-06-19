
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { useToast } from '@/hooks/use-toast';
import { getUniqueItems } from '@/utils/blueprintUtils';
import BlueprintListHeader from './listCard/BlueprintListHeader';
import BlueprintListItem from './listCard/BlueprintListItem';

interface BlueprintListCardProps {
  list: BlueprintList;
  rundownItems: RundownItem[];
  onDelete: (listId: string) => void;
  onRename: (listId: string, newName: string) => void;
  onUpdateCheckedItems: (listId: string, checkedItems: Record<string, boolean>) => void;
  onToggleUnique?: (listId: string, showUnique: boolean) => void;
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
    console.log('📋 BlueprintListCard: checkbox change for item', itemIndex, 'checked:', checked);
    console.log('📋 BlueprintListCard: current list checkedItems before update:', list.checkedItems);
    
    const updatedCheckedItems = {
      ...list.checkedItems,
      [itemIndex]: checked
    };
    
    console.log('📋 BlueprintListCard: calling onUpdateCheckedItems with:', updatedCheckedItems);
    console.log('📋 BlueprintListCard: list ID:', list.id);
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

  const getHeaderStartTime = (itemText: string) => {
    if (list.sourceColumn !== 'headers') return null;
    
    const headerItem = rundownItems.find(item => 
      isHeaderItem(item) && (
        item.notes === itemText || 
        item.name === itemText || 
        item.segmentName === itemText || 
        item.rowNumber === itemText
      )
    );
    
    return headerItem?.startTime || null;
  };

  const handleToggleUnique = (showUnique: boolean) => {
    if (onToggleUnique) {
      onToggleUnique(list.id, showUnique);
    }
  };

  // Enhanced logging for debugging checkbox state
  console.log('📋 BlueprintListCard: rendering list', list.name, 'with checkedItems:', list.checkedItems);

  return (
    <Card 
      className={`h-fit bg-gray-800 border-gray-700 transition-all duration-200 ${
        isDragging ? 'opacity-50 transform rotate-2' : ''
      }`}
      draggable
      onDragStart={(e) => onDragStart?.(e, list.id)}
      onDragEnter={(e) => onDragEnterContainer?.(e, index)}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="pb-3">
        <BlueprintListHeader
          listName={list.name}
          sourceColumn={list.sourceColumn}
          itemCount={list.items.length}
          uniqueItemCount={uniqueItems.length}
          showUniqueOnly={list.showUniqueOnly}
          onRename={(newName) => onRename(list.id, newName)}
          onCopy={copyToClipboard}
          onDelete={() => onDelete(list.id)}
          onToggleUnique={uniqueItems.length !== list.items.length ? handleToggleUnique : undefined}
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {itemsToDisplay.length === 0 ? (
            <p className="text-gray-500 italic">No items found</p>
          ) : (
            itemsToDisplay.map((item, itemIndex) => {
              const startTime = getHeaderStartTime(item);
              // For unique mode, use the original index for checkbox state
              const originalIndex = list.showUniqueOnly ? list.items.indexOf(item) : itemIndex;
              const isChecked = list.checkedItems?.[originalIndex] || false;
              
              console.log(`📋 BlueprintListCard: item ${itemIndex} "${item}" isChecked:`, isChecked);
              
              return (
                <BlueprintListItem
                  key={`${item}-${itemIndex}`}
                  item={item}
                  index={originalIndex}
                  isChecked={isChecked}
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
