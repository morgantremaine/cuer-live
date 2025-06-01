
import { useCallback } from 'react';
import { RundownModification } from './types';
import { useItemFinder } from './useItemFinder';
import { RundownItem } from '@/types/rundown';

interface UseModificationApplierProps {
  items: RundownItem[];
  updateItem: (id: string, field: string, value: string) => void;
  addRow: (calculateEndTime: any) => void;
  addHeader: () => void;
  deleteRow: (id: string) => void;
  calculateEndTime: any;
  markAsChanged: () => void;
}

export const useModificationApplier = ({
  items,
  updateItem,
  addRow,
  addHeader,
  deleteRow,
  calculateEndTime,
  markAsChanged
}: UseModificationApplierProps) => {
  const { findItemByReference } = useItemFinder(items);

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
                
                // Apply each field update immediately without setTimeout
                Object.keys(mod.data).forEach((field) => {
                  const value = mod.data[field];
                  console.log(`🖊️ Updating ${targetItem.id}.${field} = "${value}"`);
                  
                  try {
                    updateItem(targetItem.id, field, String(value));
                    console.log(`✅ Successfully updated ${field}`);
                  } catch (error) {
                    console.error(`❌ Failed to update ${field}:`, error);
                  }
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
      // Mark changes immediately to trigger re-render and auto-save
      markAsChanged();
    }
    
    console.log('🏁 === MODIFICATIONS COMPLETE ===\n');
    return changesMade;
  }, [findItemByReference, addHeader, addRow, updateItem, deleteRow, items, calculateEndTime, markAsChanged]);

  return { applyModifications };
};
