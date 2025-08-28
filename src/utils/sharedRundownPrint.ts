import { RundownItem } from '@/types/rundown';

export const handleSharedRundownPrint = (rundownTitle: string, items: RundownItem[]) => {
  // Use the same simple approach as main rundown - just trigger print
  // The browser's native print will use the global print styles in index.css
  window.print();
};