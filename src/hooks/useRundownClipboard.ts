
import { useState, useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownClipboard = () => {
  const [clipboardItems, setClipboardItems] = useState<RundownItem[]>([]);

  const copyItems = useCallback((items: RundownItem[]) => {
    const copiedItems = items.map(item => {
      const cleanItem = { ...item };
      cleanItem.id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return cleanItem;
    });
    setClipboardItems(copiedItems);
  }, []);

  const hasClipboardData = useMemo(() => {
    return clipboardItems.length > 0;
  }, [clipboardItems.length]);

  const clearClipboard = useCallback(() => {
    setClipboardItems([]);
  }, []);

  return {
    clipboardItems,
    copyItems,
    hasClipboardData,
    clearClipboard
  };
};
