
import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useRundownExportData = (
  items: RundownItem[], 
  columns: Column[], 
  title: string
) => {
  const exportData = useMemo(() => {
    if (!items || !columns || items.length === 0) {
      return null;
    }

    return {
      items,
      columns,
      title
    };
  }, [items, columns, title]);

  return exportData;
};
