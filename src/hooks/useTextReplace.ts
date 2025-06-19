
import { useCallback, useState } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { replaceTextInItems, ReplaceResult, ReplaceOperation } from '@/utils/textReplacement';

interface UseTextReplaceProps {
  items: RundownItem[];
  visibleColumns: Column[];
  updateItem: (id: string, field: string, value: string) => void;
  saveUndoState?: (items: RundownItem[], columns: Column[], title: string, action: string) => void;
  columns?: Column[];
  title?: string;
}

export const useTextReplace = ({
  items,
  visibleColumns,
  updateItem,
  saveUndoState,
  columns = [],
  title = ''
}: UseTextReplaceProps) => {
  const [isReplacing, setIsReplacing] = useState(false);
  const [lastReplaceResult, setLastReplaceResult] = useState<ReplaceResult | null>(null);

  const performReplace = useCallback(async (
    searchText: string,
    replaceText: string,
    replaceAll: boolean = false,
    targetItemId?: string,
    targetField?: string
  ): Promise<ReplaceResult> => {
    if (!searchText.trim()) {
      const result: ReplaceResult = {
        success: false,
        replacements: [],
        errors: ['Search text cannot be empty']
      };
      setLastReplaceResult(result);
      return result;
    }

    setIsReplacing(true);

    try {
      // Save undo state before making changes (only if available)
      if (saveUndoState) {
        const action = replaceAll ? 'Replace All' : 'Replace';
        saveUndoState(items, columns, title, action);
      }

      // Perform the replacement
      const result = replaceTextInItems(
        items || [],
        visibleColumns || [],
        searchText,
        replaceText,
        replaceAll,
        targetItemId,
        targetField
      );

      if (result.success && result.replacements.length > 0) {
        // Apply each replacement using the updateItem function
        for (const replacement of result.replacements) {
          if (updateItem) {
            updateItem(replacement.itemId, replacement.field, replacement.newValue);
          }
        }

        console.log(`Replace operation completed: ${result.replacements.length} replacements made`);
      }

      setLastReplaceResult(result);
      return result;
    } catch (error) {
      console.error('Replace operation failed:', error);
      const result: ReplaceResult = {
        success: false,
        replacements: [],
        errors: [`Replace operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
      setLastReplaceResult(result);
      return result;
    } finally {
      setIsReplacing(false);
    }
  }, [items, visibleColumns, updateItem, saveUndoState, columns, title]);

  const replaceInCurrentMatch = useCallback((
    searchText: string,
    replaceText: string,
    itemId: string,
    field: string
  ) => {
    return performReplace(searchText, replaceText, false, itemId, field);
  }, [performReplace]);

  const replaceAll = useCallback((
    searchText: string,
    replaceText: string
  ) => {
    return performReplace(searchText, replaceText, true);
  }, [performReplace]);

  const clearLastResult = useCallback(() => {
    setLastReplaceResult(null);
  }, []);

  return {
    isReplacing,
    lastReplaceResult,
    performReplace,
    replaceInCurrentMatch,
    replaceAll,
    clearLastResult
  };
};
