import { useState, useEffect, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { v4 as uuidv4 } from 'uuid';

export { type RundownItem };

export const useRundownItems = (
  initialItems: RundownItem[] = [],
  onItemsChange?: (items: RundownItem[]) => void
) => {
  const [items, setItems] = useState<RundownItem[]>(initialItems);

  // Sync with external changes
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Notify of changes
  useEffect(() => {
    onItemsChange?.(items);
  }, [items, onItemsChange]);

  const updateItem = useCallback((id: string, field: string, value: string) => {
    console.log('🔄 useRundownItems updateItem called:', { id, field, value });
    
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id === id) {
          // Handle nested field updates (like customFields.fieldName)
          if (field.includes('.')) {
            const [parentField, childField] = field.split('.');
            const updatedItem = {
              ...item,
              [parentField]: {
                ...(item[parentField as keyof RundownItem] as object || {}),
                [childField]: value
              }
            };
            
            // Add debugging for images field specifically
            if (field === 'images' || childField === 'images') {
              console.log('🖼️ useRundownItems updating images field:', {
                id,
                field,
                value,
                updatedItem: updatedItem
              });
            }
            
            return updatedItem;
          } else {
            const updatedItem = {
              ...item,
              [field]: value
            };
            
            // Add debugging for images field specifically
            if (field === 'images') {
              console.log('🖼️ useRundownItems updating images field (direct):', {
                id,
                field,
                value,
                beforeUpdate: item,
                afterUpdate: updatedItem
              });
            }
            
            return updatedItem;
          }
        }
        return item;
      });
      
      // Log the final result for images updates
      if (field === 'images' || field.includes('images')) {
        const updatedItem = newItems.find(item => item.id === id);
        console.log('🖼️ useRundownItems final state after images update:', {
          id,
          field,
          value,
          updatedItemImages: updatedItem?.images,
          fullUpdatedItem: updatedItem
        });
      }
      
      return newItems;
    });
  }, []);

  const addItem = useCallback((item?: Partial<RundownItem>) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      rowNumber: '',
      name: '',
      duration: '',
      startTime: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      notes: '',
      gfx: '',
      video: '',
      images: '',
      type: 'regular',
      color: '#ffffff',
      isFloating: false,
      isFloated: false,
      customFields: {},
      ...item
    };
    setItems(prev => [...prev, newItem]);
    return newItem;
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const reorderItems = useCallback((startIndex: number, endIndex: number) => {
    setItems(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const duplicateItem = useCallback((id: string) => {
    setItems(prev => {
      const index = prev.findIndex(item => item.id === id);
      if (index === -1) return prev;
      
      const itemToDuplicate = prev[index];
      const duplicatedItem: RundownItem = {
        ...itemToDuplicate,
        id: uuidv4(),
        name: `${itemToDuplicate.name} (Copy)`
      };
      
      const result = [...prev];
      result.splice(index + 1, 0, duplicatedItem);
      return result;
    });
  }, []);

  const toggleFloat = useCallback((id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, isFloating: !item.isFloating, isFloated: !item.isFloating }
        : item
    ));
  }, []);

  const setItemColor = useCallback((id: string, color: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, color } : item
    ));
  }, []);

  const addMultipleItems = useCallback((newItems: RundownItem[]) => {
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const deleteMultipleItems = useCallback((ids: string[]) => {
    setItems(prev => prev.filter(item => !ids.includes(item.id)));
  }, []);

  const clearAllItems = useCallback(() => {
    setItems([]);
  }, []);

  // Memoized computed values
  const itemsById = useMemo(() => {
    return items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {} as Record<string, RundownItem>);
  }, [items]);

  const totalDuration = useMemo(() => {
    return items.reduce((total, item) => {
      if (item.type === 'header' || item.isFloating || item.isFloated) return total;
      
      const duration = item.duration || '00:00';
      const [minutes, seconds] = duration.split(':').map(Number);
      return total + (minutes * 60) + (seconds || 0);
    }, 0);
  }, [items]);

  return {
    items,
    setItems,
    updateItem,
    addItem,
    deleteItem,
    reorderItems,
    duplicateItem,
    toggleFloat,
    setItemColor,
    addMultipleItems,
    deleteMultipleItems,
    clearAllItems,
    itemsById,
    totalDuration
  };
};
