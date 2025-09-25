
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { useToast } from '@/hooks/use-toast';
import { getUniqueItems } from '@/utils/blueprintUtils';
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
      className={`h-fit bg-gradient-to-br from-card via-card to-card/90 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-move backdrop-blur-sm ${
        isDragging ? 'opacity-50 transform rotate-2 scale-95' : 'hover:scale-[1.02]'
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnter={(e) => onDragEnterContainer?.(e, index)}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="pb-4 bg-gradient-to-r from-accent/5 to-primary/5">
        <div className="flex items-start gap-3">
          {/* Drag Handle - enhanced with gradient */}
          <div className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors duration-200 flex-shrink-0 mt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* List Header - takes up remaining space */}
          <div className="flex-1 min-w-0">
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
          {itemsToDisplay.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <svg className="h-8 w-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm italic">No items found</p>
              </div>
            </div>
          ) : (
            itemsToDisplay.map((item, itemIndex) => {
              const startTime = getHeaderStartTime(item);
              // For unique mode, use the original index for checkbox state
              const originalIndex = list.showUniqueOnly ? list.items.indexOf(item) : itemIndex;
              const isChecked = list.checkedItems?.[originalIndex] || false;
              
              // Hide time for the first item in headers list
              const shouldHideTime = list.sourceColumn === 'headers' && itemIndex === 0;
              
              logger.blueprint(`BlueprintListCard: item ${itemIndex} "${item}" isChecked:`, isChecked);
              
              return (
                <BlueprintListItem
                  key={`${item}-${itemIndex}`}
                  item={item}
                  index={originalIndex}
                  isChecked={isChecked}
                  startTime={shouldHideTime ? null : startTime}
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
