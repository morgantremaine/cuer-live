
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
      className={`h-fit bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-sm shadow-lg transition-all duration-300 cursor-move hover:shadow-xl hover:border-slate-500/60 glow-box ${
        isDragging ? 'opacity-50 transform rotate-2 scale-105 shadow-2xl' : 'hover:transform hover:scale-[1.02]'
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnter={(e) => onDragEnterContainer?.(e, index)}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-700/30 to-slate-800/30 border-b border-slate-600/50">
        <div className="flex items-start gap-3">
          {/* Drag Handle - enhanced styling */}
          <div className="p-2 rounded-lg bg-slate-700/50 border border-slate-600/50 flex-shrink-0 mt-1 hover:bg-slate-600/50 transition-colors duration-200">
            <GripVertical className="h-4 w-4 text-slate-300" />
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
      <CardContent className="pt-4">
        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-modern">
          {itemsToDisplay.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <div className="w-6 h-6 border-2 border-slate-500 border-dashed rounded-full"></div>
                </div>
                <p className="text-slate-500 italic text-sm">No items found</p>
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
