
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export const useItemFinder = (items: RundownItem[]) => {
  const findItemByReference = useCallback((reference: string): RundownItem | null => {
    console.log(`🔍 Looking for item with reference: "${reference}"`);
    console.log('📋 Available items:', items.map(item => ({ 
      id: item.id, 
      rowNumber: item.rowNumber, 
      name: item.name, 
      type: item.type 
    })));
    
    // First try to find by exact ID match
    let item = items.find(item => item.id === reference);
    if (item) {
      console.log('✅ Found by ID:', item);
      return item;
    }

    // Try to find by row number (like "A", "1", "2", etc.)
    item = items.find(item => item.rowNumber === reference);
    if (item) {
      console.log('✅ Found by rowNumber:', item);
      return item;
    }

    // Try to find by name (case insensitive partial match)
    item = items.find(item => 
      item.name.toLowerCase().includes(reference.toLowerCase()) ||
      reference.toLowerCase().includes(item.name.toLowerCase())
    );
    if (item) {
      console.log('✅ Found by name match:', item);
      return item;
    }

    // Try to find by index for headers (A, B, C, etc.)
    if (reference.match(/^[A-Z]$/)) {
      const headerLetter = reference;
      const headerIndex = headerLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
      const headers = items.filter(item => item.type === 'header');
      console.log(`🔤 Looking for header index ${headerIndex} (letter ${headerLetter})`);
      console.log('📋 Available headers:', headers);
      if (headers[headerIndex]) {
        console.log('✅ Found header by index:', headers[headerIndex]);
        return headers[headerIndex];
      }
    } 
    
    // Try to find by index for regular items (1, 2, 3, etc.)
    else if (reference.match(/^\d+$/)) {
      const rowIndex = parseInt(reference) - 1;
      const regularItems = items.filter(item => item.type === 'regular');
      console.log(`🔢 Looking for regular item index ${rowIndex}`);
      console.log('📋 Available regular items:', regularItems);
      if (regularItems[rowIndex]) {
        console.log('✅ Found regular item by index:', regularItems[rowIndex]);
        return regularItems[rowIndex];
      }
    }

    // Try partial matching on any text field
    item = items.find(item => {
      const searchTerm = reference.toLowerCase();
      return (
        item.name.toLowerCase().includes(searchTerm) ||
        item.script.toLowerCase().includes(searchTerm) ||
        item.notes.toLowerCase().includes(searchTerm) ||
        item.talent.toLowerCase().includes(searchTerm)
      );
    });
    
    if (item) {
      console.log('✅ Found by partial text match:', item);
      return item;
    }

    console.warn(`❌ Could not find item with reference: ${reference}`);
    return null;
  }, [items]);

  return { findItemByReference };
};
