
import { useState } from 'react';
import { RundownItem } from './useRundownItems';

export const useClipboard = () => {
  const [clipboardItems, setClipboardItems] = useState<RundownItem[]>([]);

  const copyItems = (items: RundownItem[]) => {
    setClipboardItems(items.map(item => ({ ...item, id: `copy_${Date.now()}_${Math.random()}` })));
  };

  const hasClipboardData = () => clipboardItems.length > 0;

  return {
    clipboardItems,
    copyItems,
    hasClipboardData
  };
};
