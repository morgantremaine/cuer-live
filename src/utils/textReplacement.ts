
import { RundownItem } from '@/types/rundown';
import { getCellValue } from '@/utils/sharedRundownUtils';
import { Column } from '@/hooks/useColumnsManager';

export interface ReplaceOperation {
  itemId: string;
  field: string;
  originalValue: string;
  newValue: string;
}

export interface ReplaceResult {
  success: boolean;
  replacements: ReplaceOperation[];
  errors: string[];
}

/**
 * Replace text in a single string value
 */
export const replaceTextInValue = (
  value: string,
  searchText: string,
  replaceText: string,
  replaceAll: boolean = false
): { newValue: string; replacementCount: number } => {
  if (!searchText || !value) {
    return { newValue: value, replacementCount: 0 };
  }

  const searchLower = searchText.toLowerCase();
  const valueLower = value.toLowerCase();
  
  if (!valueLower.includes(searchLower)) {
    return { newValue: value, replacementCount: 0 };
  }

  if (replaceAll) {
    // Replace all occurrences (case-insensitive)
    let newValue = value;
    let count = 0;
    let searchIndex = 0;
    
    while (searchIndex < newValue.length) {
      const foundIndex = newValue.toLowerCase().indexOf(searchLower, searchIndex);
      if (foundIndex === -1) break;
      
      // Replace while preserving original case context
      newValue = newValue.substring(0, foundIndex) + 
                replaceText + 
                newValue.substring(foundIndex + searchText.length);
      
      searchIndex = foundIndex + replaceText.length;
      count++;
    }
    
    return { newValue, replacementCount: count };
  } else {
    // Replace only first occurrence
    const foundIndex = valueLower.indexOf(searchLower);
    if (foundIndex !== -1) {
      const newValue = value.substring(0, foundIndex) + 
                      replaceText + 
                      value.substring(foundIndex + searchText.length);
      return { newValue, replacementCount: 1 };
    }
  }
  
  return { newValue: value, replacementCount: 0 };
};

/**
 * Replace text in a specific field of a rundown item
 */
export const replaceTextInItem = (
  item: RundownItem,
  field: string,
  searchText: string,
  replaceText: string,
  replaceAll: boolean = false
): { updatedItem: RundownItem; operation: ReplaceOperation | null } => {
  const originalValue = getCellValue(item, { key: field } as Column);
  const { newValue, replacementCount } = replaceTextInValue(originalValue, searchText, replaceText, replaceAll);
  
  if (replacementCount === 0) {
    return { updatedItem: item, operation: null };
  }

  let updatedItem: RundownItem;
  
  if (field.startsWith('customFields.')) {
    const customFieldKey = field.replace('customFields.', '');
    updatedItem = {
      ...item,
      customFields: {
        ...item.customFields,
        [customFieldKey]: newValue
      }
    };
  } else {
    updatedItem = {
      ...item,
      [field]: newValue
    };
  }

  const operation: ReplaceOperation = {
    itemId: item.id,
    field,
    originalValue,
    newValue
  };

  return { updatedItem, operation };
};

/**
 * Replace text across multiple items and fields
 */
export const replaceTextInItems = (
  items: RundownItem[],
  visibleColumns: Column[],
  searchText: string,
  replaceText: string,
  replaceAll: boolean = false,
  targetItemId?: string,
  targetField?: string
): ReplaceResult => {
  const replacements: ReplaceOperation[] = [];
  const errors: string[] = [];
  const updatedItems: RundownItem[] = [];

  try {
    for (const item of items) {
      // Skip headers for replacement operations
      if (item.type === 'header') {
        updatedItems.push(item);
        continue;
      }

      let currentItem = item;
      let itemWasModified = false;

      // If targeting a specific item and field, only process that
      if (targetItemId && targetField) {
        if (item.id === targetItemId) {
          const { updatedItem, operation } = replaceTextInItem(
            currentItem,
            targetField,
            searchText,
            replaceText,
            replaceAll
          );
          
          if (operation) {
            replacements.push(operation);
            currentItem = updatedItem;
            itemWasModified = true;
          }
        }
      } else {
        // Process all visible columns for this item
        for (const column of visibleColumns) {
          const { updatedItem, operation } = replaceTextInItem(
            currentItem,
            column.key,
            searchText,
            replaceText,
            replaceAll
          );
          
          if (operation) {
            replacements.push(operation);
            currentItem = updatedItem;
            itemWasModified = true;
            
            // If not replacing all, stop after first replacement in this item
            if (!replaceAll) break;
          }
        }
      }

      updatedItems.push(currentItem);
    }

    return {
      success: true,
      replacements,
      errors
    };
  } catch (error) {
    errors.push(`Failed to perform replacement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      replacements,
      errors
    };
  }
};
