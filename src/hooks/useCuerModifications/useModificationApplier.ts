
import { useCallback } from 'react';
import { RundownModification } from './types';
import { useItemFinder } from './useItemFinder';
import { RundownItem } from '@/types/rundown';
import { toast } from 'sonner';

interface UseModificationApplierProps {
  items: RundownItem[];
  updateItem: (id: string, field: string, value: string) => void;
  addRow: (calculateEndTime: any) => void;
  addHeader: () => void;
  addRowAtIndex: (index: number) => void;
  addHeaderAtIndex: (index: number) => void;
  deleteRow: (id: string) => void;
  calculateEndTime: any;
  markAsChanged: () => void;
  saveUndoState?: (items: RundownItem[], columns: any[], title: string, action: string) => void;
}

export const useModificationApplier = ({
  items,
  updateItem,
  addRow,
  addHeader,
  addRowAtIndex,
  addHeaderAtIndex,
  deleteRow,
  calculateEndTime,
  markAsChanged,
  saveUndoState
}: UseModificationApplierProps) => {
  const { findItemByReference } = useItemFinder(items);

  const applyModifications = useCallback((modifications: RundownModification[]) => {
    if (!modifications || modifications.length === 0) {
      console.log('No modifications to apply');
      return;
    }

    // Save undo state before applying AI modifications
    if (saveUndoState && modifications.length > 0) {
      const actionDescription = modifications.length === 1 
        ? `AI: ${modifications[0].description}`
        : `AI: Applied ${modifications.length} changes`;
      saveUndoState(items, [], '', actionDescription);
    }

    console.log('🚀 === APPLYING MODIFICATIONS ===');
    console.log('📝 Modifications received:', modifications);
    console.log('📊 Current items count:', items.length);

    // Prevent modifications if items are empty (still loading)
    if (items.length === 0) {
      console.warn('⚠️ Items still loading, delaying modifications');
      toast.error('Rundown is still loading. Please try again in a moment.');
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
              console.log('📍 Position info:', mod.position);
              
              // Calculate insertion index if position is specified
              let insertIndex: number | null = null;
              
              if (mod.position) {
                if (mod.position.type === 'at' && typeof mod.position.index === 'number') {
                  insertIndex = mod.position.index;
                  console.log(`📍 Inserting at index: ${insertIndex}`);
                } else if (mod.position.itemId && (mod.position.type === 'after' || mod.position.type === 'before')) {
                  const referenceItem = findItemByReference(mod.position.itemId);
                  if (referenceItem) {
                    const referenceIndex = items.findIndex(item => item.id === referenceItem.id);
                    if (referenceIndex !== -1) {
                      insertIndex = mod.position.type === 'after' ? referenceIndex + 1 : referenceIndex;
                      console.log(`📍 Inserting ${mod.position.type} item "${referenceItem.name}" at index: ${insertIndex}`);
                    }
                  } else {
                    console.warn(`❌ Could not find reference item: ${mod.position.itemId}`);
                  }
                }
              }
              
              // Add the item at the specified position or at the end
              if (mod.data.type === 'header') {
                if (insertIndex !== null) {
                  addHeaderAtIndex(insertIndex);
                  appliedChanges.push(`Added header at position ${insertIndex + 1}`);
                } else {
                  addHeader();
                  appliedChanges.push(`Added header at end`);
                }
              } else {
                if (insertIndex !== null) {
                  addRowAtIndex(insertIndex);
                  appliedChanges.push(`Added row at position ${insertIndex + 1}`);
                } else {
                  addRow(calculateEndTime);
                  appliedChanges.push(`Added row at end`);
                }
              }
              
              changesMade = true;
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
                
                // Apply each field update immediately
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
              console.error('❌ Update modification missing itemId or data:');
              console.error('   Full modification object:', JSON.stringify(mod, null, 2));
              console.error('   itemId present:', !!mod.itemId);
              console.error('   data present:', !!mod.data);
              console.error('   itemId value:', mod.itemId);
              console.error('   data value:', mod.data);
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
      
      // Force immediate re-render by marking changes
      markAsChanged();
      
      // Show success message
      toast.success(`Applied ${modifications.length} modification(s) successfully.`, {
        duration: 3000
      });
    } else {
      toast.error('No modifications were applied successfully.');
    }
    
    console.log('🏁 === MODIFICATIONS COMPLETE ===\n');
    return changesMade;
  }, [findItemByReference, addHeader, addRow, updateItem, deleteRow, items, calculateEndTime, markAsChanged]);

  return { applyModifications };
};
