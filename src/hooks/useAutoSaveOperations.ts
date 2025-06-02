
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSaveOperations = () => {
  const { saveRundown, updateRundown } = useRundownStorage();

  const performSave = async (
    title: string,
    items: RundownItem[],
    columns?: Column[],
    timezone?: string,
    startTime?: string,
    icon?: string
  ) => {
    console.log('AutoSaveOperations: Performing save with icon:', icon);
    return await saveRundown(title, items, columns, timezone, startTime, icon);
  };

  const performUpdate = async (
    id: string,
    title: string,
    items: RundownItem[],
    silent = false,
    archived = false,
    columns?: Column[],
    timezone?: string,
    startTime?: string,
    icon?: string
  ) => {
    console.log('AutoSaveOperations: Performing update with icon:', icon);
    return await updateRundown(id, title, items, silent, archived, columns, timezone, startTime, icon);
  };

  return {
    performSave,
    performUpdate
  };
};
