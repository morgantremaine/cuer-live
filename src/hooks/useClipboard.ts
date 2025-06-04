
import { useState } from 'react';
import { RundownItem } from '@/types/rundown';

export const useClipboard = () => {
  const [clipboardItems, setClipboardItems] = useState<RundownItem[]>([]);

  const copyItems = (items: RundownItem[]) => {
    // Create clean copies without the random ID suffix in description
    const cleanItems = items.map(item => {
      const cleanItem = { ...item };
      // Generate a new clean ID
      cleanItem.id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return cleanItem;
    });
    setClipboardItems(cleanItems);
  };

  const hasClipboardData = () => clipboardItems.length > 0;

  return {
    clipboardItems,
    copyItems,
    hasClipboardData
  };
};
