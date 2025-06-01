
import { useCallback } from 'react';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { RundownItem } from '@/types/rundown';

// Define the type locally to match the one in useCuerChat
interface RundownModification {
  type: 'add' | 'update' | 'delete';
  itemId?: string;
  data?: any;
  description: string;
}

export const useCuerModifications = () => {
  const {
    items,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    calculateEndTime,
    markAsChanged
  } = useRundownGridState();

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

  const applyModifications = useCallback((modifications: RundownModification[]) => {
    console.log('🚀 === APPLYING MODIFICATIONS ===');
    console.log('📝 Modifications received:', modifications);
    console.log('📊 Current items count:', items.length);

    // Prevent modifications if items are empty (still loading)
    if (items.length === 0) {
      console.warn('⚠️ Items still loading, delaying modifications');
      return false;
    }

    let changesMade = false;
    let appliedChanges: string[] = [];

    modifications.forEach((mod, index) => {
      console.log(`\n🔧 --- Processing modification ${index + 1}/${modifications.length} ---`);
      console.log('📋 Modification:', mod);
      
      try {
        switch (mod.type) {
          case 'add':
            if (mod.data) {
              console.log('➕ Adding new item:', mod.data);
              
              if (mod.data.type === 'header') {
                addHeader();
              } else {
                addRow(calculateEndTime);
              }
              changesMade = true;
              appliedChanges.push(`Added ${mod.data.type} item`);
              console.log('✅ Item added successfully');
            } else {
              console.error('❌ Add modification missing data');
            }
            break;
            
          case 'update':
            if (mod.itemId && mod.data) {
              console.log(`🔄 Attempting to update item with reference: "${mod.itemId}"`);
              console.log('📝 Update data:', mod.data);
              
              const targetItem = findItemByReference(mod.itemId);
              if (targetItem) {
                console.log(`✅ Found target item:`, { 
                  id: targetItem.id, 
                  name: targetItem.name, 
                  type: targetItem.type 
                });
                
                // Apply each field update with a small delay to prevent race conditions
                Object.keys(mod.data).forEach((field, fieldIndex) => {
                  const value = mod.data[field];
                  console.log(`🖊️ Updating ${targetItem.id}.${field} = "${value}"`);
                  
                  setTimeout(() => {
                    try {
                      updateItem(targetItem.id, field, String(value));
                      console.log(`✅ Successfully updated ${field}`);
                    } catch (error) {
                      console.error(`❌ Failed to update ${field}:`, error);
                    }
                  }, fieldIndex * 50); // Small delay between field updates
                });
                
                changesMade = true;
                appliedChanges.push(`Updated ${targetItem.name || targetItem.rowNumber}`);
              } else {
                console.error(`❌ Could not find item with reference: ${mod.itemId}`);
                console.log('💡 Available items for reference:');
                items.forEach((item, idx) => {
                  console.log(`   ${idx + 1}. ID: ${item.id}, Row: ${item.rowNumber}, Name: "${item.name}", Type: ${item.type}`);
                });
              }
            } else {
              console.error('❌ Update modification missing itemId or data:', mod);
            }
            break;
            
          case 'delete':
            if (mod.itemId) {
              console.log(`🗑️ Attempting to delete item with reference: "${mod.itemId}"`);
              const targetItem = findItemByReference(mod.itemId);
              if (targetItem) {
                console.log(`✅ Found item to delete:`, targetItem);
                deleteRow(targetItem.id);
                changesMade = true;
                appliedChanges.push(`Deleted ${targetItem.name || targetItem.rowNumber}`);
                console.log('✅ Item deleted successfully');
              } else {
                console.error(`❌ Could not find item to delete with reference: ${mod.itemId}`);
              }
            } else {
              console.error('❌ Delete modification missing itemId');
            }
            break;
            
          default:
            console.warn(`❓ Unknown modification type: ${mod.type}`);
        }
      } catch (error) {
        console.error(`❌ Error processing modification:`, error);
      }
    });

    if (changesMade) {
      console.log('💾 Marking changes for auto-save');
      console.log('📋 Applied changes:', appliedChanges);
      // Delay the markAsChanged call to ensure all updates are processed
      setTimeout(() => {
        markAsChanged();
      }, 200);
    }
    
    console.log('🏁 === MODIFICATIONS COMPLETE ===\n');
    return changesMade;
  }, [findItemByReference, addHeader, addRow, updateItem, deleteRow, items, calculateEndTime, markAsChanged]);

  return {
    applyModifications
  };
};
