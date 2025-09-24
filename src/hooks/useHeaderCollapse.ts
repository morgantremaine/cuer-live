import { useState, useCallback, useMemo } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export interface HeaderGroup {
  header: RundownItem;
  items: RundownItem[];
  headerIndex: number;
  startIndex: number;
  endIndex: number;
}

export const useHeaderCollapse = (items: RundownItem[]) => {
  const [collapsedHeaders, setCollapsedHeaders] = useState<Set<string>>(new Set());

  // Group items by their headers
  const headerGroups = useMemo((): HeaderGroup[] => {
    const groups: HeaderGroup[] = [];
    let currentGroup: HeaderGroup | null = null;

    items.forEach((item, index) => {
      if (isHeaderItem(item)) {
        // Save previous group if exists
        if (currentGroup) {
          currentGroup.endIndex = index - 1;
          groups.push(currentGroup);
        }
        
        // Start new group
        currentGroup = {
          header: item,
          items: [],
          headerIndex: index,
          startIndex: index,
          endIndex: index
        };
      } else if (currentGroup) {
        // Add item to current group
        currentGroup.items.push(item);
      }
    });

    // Don't forget the last group
    if (currentGroup) {
      currentGroup.endIndex = items.length - 1;
      groups.push(currentGroup);
    }

    return groups;
  }, [items]);

  // Get visible items based on collapsed state
  const visibleItems = useMemo((): RundownItem[] => {
    if (collapsedHeaders.size === 0) {
      return items;
    }

    return items.filter((item, index) => {
      // Always show headers
      if (isHeaderItem(item)) {
        return true;
      }

      // Find which header group this item belongs to
      const group = headerGroups.find(group => 
        index > group.headerIndex && index <= group.endIndex
      );

      // If no group found or group is not collapsed, show the item
      return !group || !collapsedHeaders.has(group.header.id);
    });
  }, [items, collapsedHeaders, headerGroups]);

  // Toggle header collapse state
  const toggleHeaderCollapse = useCallback((headerId: string) => {
    console.log('🎯 toggleHeaderCollapse called for header:', headerId);
    setCollapsedHeaders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(headerId)) {
        console.log('🎯 Expanding header:', headerId);
        newSet.delete(headerId);
      } else {
        console.log('🎯 Collapsing header:', headerId);
        newSet.add(headerId);
      }
      console.log('🎯 New collapsed headers:', Array.from(newSet));
      return newSet;
    });
  }, []);

  // Check if header is collapsed
  const isHeaderCollapsed = useCallback((headerId: string): boolean => {
    return collapsedHeaders.has(headerId);
  }, [collapsedHeaders]);

  // Get items that should move together with a header when dragging
  const getHeaderGroupItems = useCallback((headerId: string): RundownItem[] => {
    const group = headerGroups.find(g => g.header.id === headerId);
    if (!group) {
      console.warn('🚨 Header group not found for header:', headerId);
      return [];
    }
    
    console.log('🎯 Header group found:', {
      headerId,
      headerIndex: group.headerIndex,
      itemCount: group.items.length,
      startIndex: group.startIndex,
      endIndex: group.endIndex,
      items: group.items.map(item => ({ id: item.id, type: item.type, name: item.name }))
    });
    
    return [group.header, ...group.items];
  }, [headerGroups]);

  // Get all item IDs in a header group (for drag operations)
  const getHeaderGroupItemIds = useCallback((headerId: string): string[] => {
    const groupItems = getHeaderGroupItems(headerId);
    return groupItems.map(item => item.id);
  }, [getHeaderGroupItems]);

  return {
    collapsedHeaders,
    headerGroups,
    visibleItems,
    toggleHeaderCollapse,
    isHeaderCollapsed,
    getHeaderGroupItems,
    getHeaderGroupItemIds
  };
};